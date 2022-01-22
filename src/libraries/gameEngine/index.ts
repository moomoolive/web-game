import * as three from "three"
import { ref } from "vue"

import { Player } from "./player"
import { globals } from "@/consts"
import { ThirdPersonCamera } from "./camera"
import { MainGameThread } from "@/libraries/workers/threadTypes/mainGameThread"
import { garbageCollectWebGLContext } from "@/libraries/webGL/index"
import { 
    createDebugCamera, 
    createRenderer, 
    createSceneCamera,
    createDirectionalLight,
    createWorldBackground,
    createWorldPlane,
    EngineIndicator
} from "./utils/initialization"
import { renderingThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { RenderingThreadHandlerLookup, } from "@/libraries/workers/types"
import { Game, GameOptions, UIReferences, EngineOptions } from "./types"

const logger = {
    log(...args: any[]) {
        console.log(renderingThreadIdentity(), ...args)
    },
    warn(...args: any[]) {
        console.warn(renderingThreadIdentity(), ...args)
    },
    error(...args: any[]) {
        console.error(renderingThreadIdentity(), ...args)
    },
} as const

const HAS_NOT_RENDERED_YET = -1

export function createGame(options: GameOptions): Game {
    const performanceMeter = options.performanceMeter

    // for garbage collection
    const sceneGeometry: three.BufferGeometry[] = []
    const sceneMaterials: three.Material[] = []

    let previousFrameTimestamp = HAS_NOT_RENDERED_YET
    const renderer = createRenderer()
    const camera = createSceneCamera()
    const scene = new three.Scene()
    scene.add(createDirectionalLight())
    const player = new Player()
    let thirdPersonCamera = new ThirdPersonCamera(camera, player.model)

    const mainEngineIndicator = new EngineIndicator()

    const mainThread = new MainGameThread()

    const showMenu = ref(false)
    // debug tools
    const debugCamera = createDebugCamera(camera, renderer.domElement)
    const paused = ref(false)
    const renderCount = ref(0)
    const debugCameraEnabled = ref(false)
    // end

    scene.background = createWorldBackground([
        '/game/basic/posx.jpg',
        '/game/basic/negx.jpg',
        '/game/basic/posy.jpg',
        '/game/basic/negy.jpg',
        '/game/basic/posz.jpg',
        '/game/basic/negz.jpg',
    ])

    const { mesh, material, geometry } = createWorldPlane()
    scene.add(mesh)
    sceneGeometry.push(geometry)
    sceneMaterials.push(material)

    player.initialize()
        .then(() => { 
            scene.add(player.model)
            thirdPersonCamera = new ThirdPersonCamera(camera, player.model)
        })
        .catch(err => logger.error("ASSET_LOADING_ERROR:", err))
    
    const engineOptions: EngineOptions = {
        loadFromCrash: false
    }

    const HANDLER_LOOKUP: Readonly<RenderingThreadHandlerLookup> = {
        keyDownResponse(payload: Float64Array) {
            const [keyCode] = payload
            player.onKeyDown(keyCode)
        },
        keyUpResponse(payload: Float64Array) {
            const [keyCode] = payload
            player.onKeyUp(keyCode)
        },
        acknowledgePing(_: Float64Array, __: string[], id: number) {
            logger.log("ping acknowledged @", Date.now())
            mainEngineIndicator.setReady()
            mainThread.renderingPingAcknowledged(id, engineOptions)

            if (engineOptions.loadFromCrash) {
                engineOptions.loadFromCrash = false
            }
        },
        respondToFatalError() {
            /* tell user about error */
            logger.warn("main thread has encountered fatal error, preparing for restart...")
            mainThread.prepareForRestart(2)
            engineOptions.loadFromCrash = true
        },
        readyForRestart() {
            logger.log("⚡recieved restart confirmation")
            mainThread.restart()
        }

    }

    mainThread.setOnMessageHandler(message => {
        const data = message.data
        try {
            const { id, payload, meta, handler } = data 
            HANDLER_LOOKUP[handler](payload, meta, id)
        } catch(err) {
            logger.warn("something went wrong when looking up function")
            logger.warn("message:", data)
            logger.error("error:", err)
        }
    })

    function onKeyDown(event: KeyboardEvent) {
        if (event.repeat) {
            return
        }
        mainThread.notifyKeyDown(event)
    }

    function onKeyUp(event: KeyboardEvent) {
        if (event.repeat) {
            return
        }
        mainThread.notifyKeyUp(event)
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }

    // rename or remove?
    function updateEntities(timeElaspsedMilliseconds: number) {
        const timeElapsedSeconds = timeElaspsedMilliseconds / globals.MILLISECONDS_IN_SECOND
        player.update(timeElapsedSeconds)
    }

    function renderLoop() {
        window.requestAnimationFrame(currentTimestamp => {
            if (paused.value) {
                performanceMeter.begin()
            }
            if (previousFrameTimestamp === HAS_NOT_RENDERED_YET) {
                previousFrameTimestamp = currentTimestamp
            }
            renderer.render(scene, camera)
            if (paused.value) {
                return renderLoop()
            }
            const timeElaspsedMilliseconds = currentTimestamp - previousFrameTimestamp
            updateEntities(timeElaspsedMilliseconds)
            thirdPersonCamera.update(timeElaspsedMilliseconds)
            previousFrameTimestamp = currentTimestamp
            renderCount.value++
            performanceMeter.end()
            renderLoop()
        })
    }

    return {
        vueRefs(): UIReferences {
            return { paused, showMenu, debugCameraEnabled, renderCount }
        },
        domElement(): HTMLCanvasElement {
            return renderer.domElement
        },
        async initialize(): Promise<void> {
            try {
                //await mainEngineIndicator.awaitReadySignal()
                window.addEventListener("resize", onWindowResize)
                window.addEventListener("keydown", onKeyDown)
                window.addEventListener("keyup", onKeyUp)
            } catch {
                throw new Error("main thread could not initalize, engine is shutting down")
            }
        },
        destroy() {
            window.removeEventListener("resize", onWindowResize)
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("keyup", onKeyDown)

            player.destroy()
            sceneGeometry.map(geometry => geometry.dispose())
            sceneMaterials.map(material => material.dispose())
            // do a canvas wide garbage collection, in case something was missed
            garbageCollectWebGLContext(renderer.domElement)
            debugCamera.dispose()
            renderer.dispose()
            mainThread.terminate()
        },
        run() {
            if (paused.value) {
                return
            }
            renderLoop()
        },
        togglePause() {
            paused.value = !paused.value
        },
        toggleMenu() {
            showMenu.value = !showMenu.value
        },
        enableDebugCamera() {
            thirdPersonCamera.enabled = false
            const { x, y, z } = thirdPersonCamera.lookAt
            debugCamera.target.set(x, y, z)
            debugCamera.update()
            // how can I merge these two into one state?
            debugCamera.enabled = true
            debugCameraEnabled.value = true
        },
        disableDebugCamera() {
            debugCamera.enabled = false
            debugCameraEnabled.value = false

            thirdPersonCamera.reposition()
            thirdPersonCamera.enabled = true
        },
        toggleDebugCamera() {
            if (debugCamera.enabled) {
                this.disableDebugCamera()
            } else {
                this.enableDebugCamera()
            }
        }
    }
}
