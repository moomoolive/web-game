import * as three from "three"
import { ref, Ref } from "vue"
import Stats from "stats.js"

//import { Player } from "./player"
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
import { errors, rendering } from "./consts"
import { AppDatabase } from "@/libraries/appDB/index"
import { MainThreadEvent, EventHandlers } from "./types"
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader"

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

async function loadModel(modelHref: string): Promise<three.Group> {
    return new Promise((resolve) => {
      const loader = new FBXLoader()
      loader.load(modelHref, fbx => resolve(fbx))  
    })
}

async function loadAnimation(animationHref: string): Promise<three.AnimationClip> {
    return new Promise((resolve) => {
      const loader = new FBXLoader()
      loader.load(animationHref, fbx => resolve(fbx.animations[0]))  
    })
}

type AnimationIndex = {
    [key: string]: { clip: three.AnimationClip, action: three.AnimationAction }
}

interface AnimationComponent {
    mixer: three.AnimationMixer,
    animations: AnimationIndex
    currentAnimation: string
}

interface MovementComponent {
    velocity: {
        x: number,
        y: number,
        z: number
    },
    acceleration: {
        x: number,
        y: number,
        z: number
    },
    deceleration: {
        x: number,
        y: number,
        z: number
    },
}

export function createGame(options: GameOptions): Game {
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
    let thirdPersonCamera = new ThirdPersonCamera(camera, new three.Group())

    const mainEngineIndicator = new EngineIndicator()

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

    /*
    player.initialize()
        .then(() => { 
            scene.add(player.model)
            thirdPersonCamera = new ThirdPersonCamera(camera, player.model)
        })
        .catch(err => logger.error("ASSET_LOADING_ERROR:", err))
    */

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }

    /*
    // rename or remove?
    function updateEntities(timeElaspsedMilliseconds: number) {
        const timeElapsedSeconds = timeElaspsedMilliseconds / globals.MILLISECONDS_IN_SECOND
        player.update(timeElapsedSeconds)
    }
    */

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

    /*
    const EVENT_HANDLER_LOOKUP: Readonly<MainThreadEventHandlerLookup> = {
        keyDown(payload: number[]) {
            const [keyCode] = payload
            //player.onKeyDown(keyCode)
        },
        keyUp(payload: number[]) {
            const [keyCode] = payload
            //player.onKeyUp(keyCode)
        }
    }
    */

    let incomingEventsQueue: MainThreadEvent[] = []

    const playerId = 0
    const movementComponent: MovementComponent[] = []
    const modelComponent: three.Group[] = []
    const animationComponent: AnimationComponent[] = []
    
    function renderLoop() {
        window.requestAnimationFrame(async (currentTimestamp) => {
            try {
                if (paused.value) {
                    performanceMeter.begin()
                }
                const timeElaspsedMilliseconds = currentTimestamp - previousFrameTimestamp
                const timeElaspedSeconds = timeElaspsedMilliseconds / 1_000

                /* input system */
                for (let i = 0; i < incomingEventsQueue.length; i++) {
                    const { id, payload, handler } = incomingEventsQueue[i]
                    const target = modelComponent[playerId]
                    const [keyCode] = payload
                    const axisAngle = new three.Vector3(0, 1, 0)
                    const movementQuaternion = new three.Quaternion()
                    switch (keyCode) {
                        case 87: // w
                            movementComponent[playerId].velocity.z += (movementComponent[playerId].velocity.z * timeElaspedSeconds)
                            break
                        case 65: // a
                            movementQuaternion.setFromAxisAngle(axisAngle, 0.02)
                            target.quaternion.copy(
                                target.quaternion.clone().multiply(movementQuaternion)
                            )
                            break
                        /*
                        case 83: // s
                            target.position.z -= 0.5
                            break
                        */
                        case 68: // d
                            movementQuaternion.setFromAxisAngle(axisAngle, -0.02)
                            target.quaternion.copy(
                                target.quaternion.clone().multiply(movementQuaternion)
                            )
                        break
                    }
                }
                incomingEventsQueue = []

                /* movement system */
                for (let i = 0; i < movementComponent.length; i++) {
                    const movement = movementComponent[i]
                    const target = modelComponent[i]

                    const frameDeccelerationX = (movement.deceleration.x + movement.velocity.x) * timeElaspedSeconds
                    const frameDeccelerationY = (movement.deceleration.y + movement.velocity.y) * timeElaspedSeconds
                    let frameDeccelerationZ = (movement.deceleration.z + movement.velocity.z) * timeElaspedSeconds
                    frameDeccelerationZ = Math.sign(frameDeccelerationZ) * Math.min(
                        Math.abs(frameDeccelerationZ), Math.abs(movement.velocity.z)
                    )

                    movement.velocity.x += frameDeccelerationX
                    movement.velocity.y += frameDeccelerationY
                    movement.velocity.z += frameDeccelerationZ

                    const forwardMotion = new three.Vector3(0, 0, 1)
                    forwardMotion.applyQuaternion(target.quaternion)
                    forwardMotion.normalize()
                    forwardMotion.multiplyScalar(movement.velocity.z * timeElaspedSeconds)
                    target.position.add(forwardMotion)

                    const sidewaysMotion = new three.Vector3(1, 0, 0)
                    sidewaysMotion.applyQuaternion(target.quaternion)
                    sidewaysMotion.normalize()
                    sidewaysMotion.multiplyScalar(movement.velocity.x * timeElaspedSeconds)
                    target.position.add(sidewaysMotion)
                }

                previousFrameTimestamp = currentTimestamp
                renderer.render(scene, camera)
                if (paused.value) {
                    return renderLoop()
                }
                
                /* animation system */
                animationComponent.forEach(component => component.mixer.update(timeElaspedSeconds))
                
                /* camera system */
                thirdPersonCamera.update(timeElaspsedMilliseconds)
                
                renderCount.value++
                performanceMeter.end()
                renderLoop()
            } catch(err) {
                /*
                let loopRetryCount = 0
                let resetLoopRetryCountTimerId = errors.timerNotDefinedYet
                */
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
                const [playerModel, idleClip, walkingClip] = await Promise.all([
                    loadModel("/game/player/t-pose.fbx"),
                    loadAnimation("/game/player/idle.fbx"),
                    loadAnimation("/game/player/walking.fbx")
                ])
                playerModel.scale.setScalar(0.1)
                scene.add(playerModel)
                playerModel.traverse(c => c.castShadow = true)
                modelComponent[0] = playerModel
                const mixer = new three.AnimationMixer(playerModel)
                animationComponent[0] = {
                    animations: {
                        idle: { 
                            action: mixer.clipAction(idleClip),
                            clip: idleClip 
                        },
                        walking: {
                            action: mixer.clipAction(walkingClip),
                            clip: walkingClip
                        }
                    },
                    mixer,
                    currentAnimation: "idle"
                }
                animationComponent[0].animations.idle.action.setEffectiveTimeScale(1.0)
                animationComponent[0].animations.idle.action.setEffectiveWeight(1.0)
                animationComponent[0].animations.idle.action.play()
                movementComponent.push({ 
                    velocity: { x: 0, y: 0, z: 0 },
                    acceleration: { x: 1, y: 0.25, z: 50 },
                    deceleration: { x: -0.0005, y: -0.0001, z: -50 }
                })
                thirdPersonCamera = new ThirdPersonCamera(camera, playerModel)
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
            //player.destroy()
            sceneGeometry.map(geometry => geometry.dispose())
            sceneMaterials.map(material => material.dispose())
            // do a canvas wide garbage collection, in case something was missed
            garbageCollectWebGLContext(renderer.domElement)
            debugCamera.dispose()
            renderer.dispose()
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
