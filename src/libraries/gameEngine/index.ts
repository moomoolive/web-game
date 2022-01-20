import * as three from "three"
import Stats from "stats.js"
import { Ref, ref } from "vue"

import { Player } from "./player"
import { MILLISECONDS_IN_SECOND } from "@/consts"
import { ThirdPersonCamera } from "./camera"
import { MainGameThread } from "@/libraries/workers/workerTypes/index"
import { 
    RenderingThreadCodes,
    renderingThreadCodes 
} from "@/libraries/workers/messageCodes/renderingThread"
import { ThreadExecutor } from "@/libraries/workers/types"
import { garbageCollectWebGLContext } from "@/libraries/webGL/index"
import { renderingThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { 
    createDebugCamera, 
    createRenderer, 
    createSceneCamera,
    createDirectionalLight,
    createWorldBackground,
    createWorldPlane,
    EngineIndicator
} from "./utils/initialization"
import { 
    getThreadStreamId, 
    getThreadStreamHandler,
    threadSteamPayloadFirst 
} from "@/libraries/workers/threadStreams/index"

const HAS_NOT_RENDERED_YET = -1

type RenderingThreadFunctionLookup = {
    [key in RenderingThreadCodes]: ThreadExecutor
}

interface GameOptions {
    developmentMode: boolean
    performanceMeter: Stats
}

type VueRef<T> = Readonly<Ref<T>>

interface UIReferences {
    paused: VueRef<boolean>
    showMenu: VueRef<boolean>
    debugCameraEnabled: VueRef<boolean>
    renderCount: VueRef<number>
}

interface Game {
    vueRefs: () => UIReferences
    domElement: () => HTMLCanvasElement
    initialize: () => Promise<void>
    destroy: () => void
    run: () => void
    togglePause: () => void
    toggleMenu: () => void
    enableDebugCamera: () => void
    disableDebugCamera: () => void
    toggleDebugCamera: () => void
}

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
    mainThread.setFatalErrorHandler(err => {
        console.error(
            renderingThreadIdentity(), 
            "fatal error occurred on main thread, error:", 
            err
        )
    })

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
        .catch(err => console.error(renderingThreadIdentity(), "ASSET_LOADING_ERROR:", err))
    
    const HANDLER_LOOKUP: Readonly<RenderingThreadFunctionLookup> = {
        [renderingThreadCodes.keyDownResponse](stream: Float64Array) {
            const keyCode = threadSteamPayloadFirst(stream)
            player.onKeyDown(keyCode)
        },
        [renderingThreadCodes.keyUpResponse](stream: Float64Array) {
            const keyCode = threadSteamPayloadFirst(stream)
            player.onKeyUp(keyCode)
        },
        [renderingThreadCodes.acknowledgePing](stream: Float64Array) {
            console.log(renderingThreadIdentity(), "ping acknowledged @", Date.now())
            mainEngineIndicator.setReady()
            const streamId = getThreadStreamId(stream)
            mainThread.renderingPingAcknowledged(streamId)
        }
    }

    mainThread.setOnMessageHandler(message => {
        try {
            const stream = message.data
            const handler = getThreadStreamHandler(stream) as RenderingThreadCodes
            HANDLER_LOOKUP[handler](stream)
        } catch(err) {
            console.warn(renderingThreadIdentity(), "something went wrong when looking up function, payload", message.data)
            console.error("error:", err)
        }
    })

    function onKeyDown(event: KeyboardEvent) {
        mainThread.notifyKeyDown(event)
    }

    function onKeyUp(event: KeyboardEvent) {
        mainThread.notifyKeyUp(event)
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }

    // rename or remove?
    function updateEntities(timeElaspsedMilliseconds: number) {
        const timeElapsedSeconds = timeElaspsedMilliseconds / MILLISECONDS_IN_SECOND
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
                await mainEngineIndicator.awaitReadySignal()
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
