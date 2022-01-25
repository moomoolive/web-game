import * as three from "three"
import { ref, Ref } from "vue"
import Stats from "stats.js"

import { Player } from "./player"
import { globals } from "@/consts"
import { ThirdPersonCamera } from "./camera"
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
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { WorkerPool } from "@/libraries/workers/threadPool"
import { errors, rendering } from "./consts"
import { AppDatabase } from "@/libraries/appDB/index"
import { ECS } from "@/libraries/ecs/index"
import { MainThreadEvent, EventHandlers } from "./types"
import { 
    createWorld, 
    addEntity,
    defineComponent,
    Types,
    addComponent,
    removeComponent,
    defineQuery,
} from "bitecs"

const logger = {
    log(...args: any[]) {
        console.log(mainThreadIdentity(), ...args)
    },
    warn(...args: any[]) {
        console.warn(mainThreadIdentity(), ...args)
    },
    error(...args: any[]) {
        console.error(mainThreadIdentity(), ...args)
    },
} as const

export interface GameOptions {
    developmentMode: boolean
    performanceMeter: Stats
}

export function createGame(options: GameOptions): Game {
    const world = createWorld()
    world.name = "web-game"

    const playerEntityId = addEntity(world)
    
    const Movement = defineComponent({
        velocityX: Types.f64,
        velocityY: Types.f64,
        velocityZ: Types.f64,
        quaternionX: Types.f64,
        quaternionY: Types.f64,
        quaternionZ: Types.f64,
        quaternionW: Types.f64,
    })

    const movementQuery = defineQuery([Movement])

    addComponent(world, Movement, playerEntityId)

    const movementSystem = (w: typeof world) => {
        const movementEntities = movementQuery(w)
        return world
    }

    const performanceMeter = options.performanceMeter
    const db = new AppDatabase()

    // for garbage collection
    const sceneGeometry: three.BufferGeometry[] = []
    const sceneMaterials: three.Material[] = []

    let previousFrameTimestamp = rendering.hasNotRenderedYet
    const renderer = createRenderer()
    const camera = createSceneCamera()
    const scene = new three.Scene()
    scene.add(createDirectionalLight())
    const player = new Player()
    let thirdPersonCamera = new ThirdPersonCamera(camera, player.model)

    const mainEngineIndicator = new EngineIndicator()

    const workerPool = new WorkerPool({ threadCount: 1 })

    const showMenu = ref(false)
    const debugCamera = createDebugCamera(camera, renderer.domElement)
    const paused = ref(false)
    const renderCount = ref(0)
    const debugCameraEnabled = ref(false)

    const showFatalErrorMessage = ref(false)
    const fatalErrorDetails = ref("no error")
    const fatalErrorSource = ref("no error")
    const allowFatalErrorMessageToClose = ref(false)

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

    async function restartEngine() {
        logger.warn("engine has requested restart, probably due to an unrecoverable error")
        logger.warn("⚡restarting immediately...")
        logger.log("preparing for backup")
        try {
            /* presumably this will be the game state when figured out */
            const state = {}
            await db.createCrashSave(JSON.stringify(state))
            logger.log("backup successfully created")
        } catch(err) {
            logger.error("backup protocol failed, error:", err)
        }
        logger.log("⚡ready for restart")
    }

    const EVENT_HANDLER_LOOKUP: Readonly<MainThreadEventHandlerLookup> = {
        keyDown(payload: number[]) {
            const [keyCode] = payload
            player.onKeyDown(keyCode)
        },
        keyUp(payload: number[]) {
            const [keyCode] = payload
            player.onKeyUp(keyCode)
        }
    }

    const ecs = new ECS()
    const playerId = ecs.createEntity(true)
    ecs.componentManager.controller.push({ entityId: playerId, targetEvents: "keyboard" })
    ecs.addSystem("inputHandler", (incomingEventsQueue:MainThreadEvent[]) => {
        for (let i = 0; i < incomingEventsQueue.length; i++) {
            const { id, payload, handler } = incomingEventsQueue[i]
            try {
                EVENT_HANDLER_LOOKUP[handler](payload, id)
            } catch(err) {
                logger.warn("something went wrong when looking up handler for incoming event")
                logger.warn("event:", incomingEventsQueue[i])
                logger.error("error", err)
            }
        }
        /* 
            all unsuccesful events are forgotten
            so that event queue doesn't clog 
        */
        incomingEventsQueue = []
    })

    let loopRetryCount = 0
    let resetLoopRetryCountTimerId = errors.timerNotDefinedYet
    let incomingEventsQueue: MainThreadEvent[] = []

    function handleIncomingEvents() {
        for (let i = 0; i < incomingEventsQueue.length; i++) {
            const { id, payload, handler } = incomingEventsQueue[i]
            try {
                EVENT_HANDLER_LOOKUP[handler](payload, id)
            } catch(err) {
                logger.warn("something went wrong when looking up handler for incoming event")
                logger.warn("event:", incomingEventsQueue[i])
                logger.error("error", err)
            }
        }
        /* 
            all unsuccesful events are forgotten
            so that event queue doesn't clog 
        */
        incomingEventsQueue = []
    }

    function loadGameStateFromCrashSave() {

    }
    
    function renderLoop() {
        window.requestAnimationFrame(async (currentTimestamp) => {
            try {
                if (paused.value) {
                    performanceMeter.begin()
                }
                handleIncomingEvents()
                movementSystem(world)
                const timeElaspsedMilliseconds = currentTimestamp - previousFrameTimestamp
                previousFrameTimestamp = currentTimestamp
                renderer.render(scene, camera)
                if (paused.value) {
                    return renderLoop()
                }
                updateEntities(timeElaspsedMilliseconds)
                thirdPersonCamera.update(timeElaspsedMilliseconds)
                renderCount.value++
                performanceMeter.end()
                renderLoop()
            } catch(err) {
                logger.error("an uncaught exception occurred in game loop. Restarting! Error:", err)
                /* off for now */
                /*
                loopRetryCount++
                clearTimeout(resetLoopRetryCountTimerId)
                setTimeout(() => loopRetryCount = 0, errors.resetRetryCountAfter)
                if (loopRetryCount < errors.maxRetryCount) {
                    return renderLoop()
                }
                logger.warn(
                    "loop has failed more than",
                    errors.maxRetryCount,
                    "times, this error is probably fatal.",
                    "Engine will attempt to restart"
                )

                fatalErrorDetails.value = (err as string)?.toString()
                fatalErrorSource.value = "gameLoopError"
                allowFatalErrorMessageToClose.value = false
                showFatalErrorMessage.value = true

                
                await restartEngine()
                loadGameStateFromCrashSave()
                
                allowFatalErrorMessageToClose.value = true
                */
                //renderLoop()
            }
        })
    }

    function addToEventQueue(payload: number[], id: number, handler: EventHandlers) {
        incomingEventsQueue.push({ payload, id, handler })
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.repeat) {
            return
        }
        addToEventQueue([event.keyCode], 1, "keyDown")
    }

    function onKeyUp(event: KeyboardEvent) {
        if (event.repeat) {
            return
        }
        addToEventQueue([event.keyCode], 1, "keyUp")
    }

    return {
        vueRefs(): UIReferences {
            return { 
                paused, 
                showMenu, 
                debugCameraEnabled, 
                renderCount,
                showFatalErrorMessage,
                fatalErrorDetails,
                fatalErrorSource,
                allowFatalErrorMessageToClose
            }
        },
        domElement(): HTMLCanvasElement {
            return renderer.domElement
        },
        async waitUntilReady(): Promise<void> {
            await mainEngineIndicator.awaitReadySignal()
        },
        async initialize(): Promise<void> {
            try {
                await workerPool.initialize()
                window.addEventListener("keydown", onKeyDown)
                window.addEventListener("keyup", onKeyUp)
                window.addEventListener("resize", onWindowResize)
                logger.log("🔥game loop ready")
                mainEngineIndicator.setReady()
            } catch(err) {
                fatalErrorDetails.value = (err as string)?.toString()
                fatalErrorSource.value = "initalization protocol"
                allowFatalErrorMessageToClose.value = true
                showFatalErrorMessage.value = true
                throw err
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
            workerPool.terminate()
        },
        run() {
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
        },
        closeFatalMessageNotice() {
            showFatalErrorMessage.value = false
        }
    }
}

export interface Game {
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
    closeFatalMessageNotice: () => void
    waitUntilReady: () => Promise<void>
}

export type VueRef<T> = Readonly<Ref<T>>

export interface UIReferences {
    paused: VueRef<boolean>
    showMenu: VueRef<boolean>
    debugCameraEnabled: VueRef<boolean>
    renderCount: VueRef<number>
    fatalErrorSource: VueRef<string>
    showFatalErrorMessage: VueRef<boolean>
    fatalErrorDetails: VueRef<string>
    allowFatalErrorMessageToClose: VueRef<boolean>
}

type MainThreadEventHandler = ((payload: number[], id: number) => void) |
    ((payload: number[]) => void) |
    (() => void)


type MainThreadEventHandlerLookup = {
    [key in EventHandlers]: MainThreadEventHandler
}
