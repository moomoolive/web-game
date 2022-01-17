import * as three from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import Stats from "stats.js"
import { Ref, ref } from "vue"

import { Player } from "./player"
import { MILLISECONDS_IN_SECOND } from "@/consts"
import { ThirdPersonCamera } from "./camera"

const HAS_NOT_RENDERED_YET = -1

interface GameOptions {
    developmentMode: boolean
    performanceMeter: Stats
}

type VueRef<T> = Readonly<Ref<T>>

interface UIReferences {
    paused: VueRef<boolean>
    showMenu: VueRef<boolean>
    frozen: VueRef<boolean>
    debugCameraEnabled: VueRef<boolean>
    renderCount: VueRef<number>
}

export class Game {
    #renderer = new three.WebGLRenderer()
    #camera = new three.PerspectiveCamera()
    #scene = new three.Scene()
    #previousFrameTimestamp = HAS_NOT_RENDERED_YET
    #addedToDOM = false
    #player = new Player()
    
    // garabage collection
    #sceneMaterials: three.Material[] = []
    #sceneGeometry: three.BufferGeometry[] = []
    
    // game flags
    #developmentMode = true

    // debug tools
    #debugCamera = new OrbitControls(this.#camera, this.#renderer.domElement)
    #debugCameraEnabled = ref(false)
    #paused = ref(false)
    #frozen = ref(false)
    #renderCount = ref(0)

    // ui elements
    #showMenu = ref(false)

    // uninitialized
    #thirdPersonCamera: ThirdPersonCamera
    #performanceMeter: Stats

    constructor(options: GameOptions) {
        this.#developmentMode = options.developmentMode
        this.#performanceMeter = options.performanceMeter

        this.#renderer = this.#initRenderer()
        this.#camera = this.#initCamera()
        this.#scene = new three.Scene()
        this.#debugCamera = this.#initDebugCamera()
        this.#thirdPersonCamera = new ThirdPersonCamera(this.#camera, this.#player.model)
        this.#scene.add(this.#createDirectionalLight())
        this.#loadWorldAssets()
        this.#basicWorldSetup()
        this.#addPlayer()
    }

    get vueRefs(): UIReferences {
        return {
            paused: this.#paused,
            showMenu: this.#showMenu,
            frozen: this.#frozen,
            debugCameraEnabled: this.#debugCameraEnabled,
            renderCount: this.#renderCount
        }
    }

    async #addPlayer() {
        try {
            await this.#player.initialize()
            this.#scene.add(this.#player.model)
            this.#thirdPersonCamera = new ThirdPersonCamera(this.#camera, this.#player.model)
        } catch(err) {
            console.error("ASSET_LOADING_ERROR:", err)
        }
    }

    addToDOM() {
        if (this.#addedToDOM) {
            return
        }
        // sometimes when using hot reload
        // previous canvas is still attached to dom
        // and has webGL buffers that haven't been
        // garbage collected
        if (this.#developmentMode) {
            const oldCanvases = document.getElementsByTagName("canvas")
            for (let i = 0; i < oldCanvases.length; i++) {
                const canvas = oldCanvases[i]
                // garabage collect all old 3d model buffers
                this.#garbageCollectAllContext(canvas)
                // throws error for some reason???
                //document.body.removeChild(canvas)
            }
        }
        document.body.appendChild(this.#renderer.domElement)
        window.addEventListener("resize", () => this.#onWindowResize())
        this.#addedToDOM = true
    }

    #initDebugCamera(): OrbitControls {
        const debugCamera = new OrbitControls(this.#camera, this.#renderer.domElement)
        debugCamera.target.set(0, 20, 0)
        debugCamera.update()
        debugCamera.enabled = false
        return debugCamera
    }

    #initRenderer(): three.WebGLRenderer {
        const renderer = new three.WebGLRenderer({ antialias: true })
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = three.PCFSoftShadowMap
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.setSize(window.innerWidth, window.innerHeight)
        return renderer
    }

    #initCamera(): three.PerspectiveCamera {
        const fov = 60
        const aspect = 1920 / 1080
        const near = 1.0
        const far = 1000.0
        const camera = new three.PerspectiveCamera(fov, aspect, near, far)
        camera.position.set(25, 10, 25)
        return camera
    }

    #createDirectionalLight(): three.DirectionalLight {
        const directionalLight = new three.DirectionalLight(0xFFFFFF, 1.0)
        directionalLight.position.set(20, 100, 10)
        directionalLight.target.position.set(0, 0, 0)
        directionalLight.castShadow = true
        directionalLight.shadow.bias = -0.001
        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048
        directionalLight.shadow.camera.near = 0.1
        directionalLight.shadow.camera.far = 500.0
        directionalLight.shadow.camera.near = 0.5
        directionalLight.shadow.camera.far = 500.0
        directionalLight.shadow.camera.left = 100
        directionalLight.shadow.camera.right = -100
        directionalLight.shadow.camera.top = 100
        directionalLight.shadow.camera.bottom = -100
        return directionalLight
    }

    #loadWorldAssets() {
        const loader = new three.CubeTextureLoader()
        const texture = loader.load([
            '/game/basic/posx.jpg',
            '/game/basic/negx.jpg',
            '/game/basic/posy.jpg',
            '/game/basic/negy.jpg',
            '/game/basic/posz.jpg',
            '/game/basic/negz.jpg',
        ])
        this.#scene.background = texture
    }

    #basicWorldSetup() {
        const geometry = new three.PlaneBufferGeometry(100, 100, 10, 10)
        const mesh = new three.MeshStandardMaterial({ color: 0xFFFFFF })
        const plane = new three.Mesh(geometry, mesh)
        this.#sceneGeometry.push(geometry)
        this.#sceneMaterials.push(mesh)
        plane.castShadow = false
        plane.receiveShadow = false
        plane.rotation.x = -Math.PI / 2
        this.#scene.add(plane)
    }

    #onWindowResize() {
        this.#camera.aspect = window.innerWidth / window.innerHeight
        this.#camera.updateProjectionMatrix()
        this.#renderer.setSize(window.innerWidth, window.innerHeight)
    }

    destroy() {
        this.#freeze()
        this.#player.destroy()
        // currently a memory leak occurs for the "#onWindowResize"
        // window listener
        //window.removeEventListener("resize", resizeCallback)
        document.body.removeChild(this.#renderer.domElement)
        this.#sceneGeometry.map(geometry => geometry.dispose())
        this.#sceneMaterials.map(material => material.dispose())
        // do a canvas wide garbage collection, in case something was missed
        this.#garbageCollectAllContext(this.#renderer.domElement)
        this.#debugCamera.dispose()
        this.#renderer.dispose()
    }

    // garabage collects all webGL buffers assocaited with canvas
    #garbageCollectAllContext(canvas: HTMLCanvasElement) {
        canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext()
        canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()
    }

    #updateEntities(timeElaspsedMilliseconds: number) {
        const timeElapsedSeconds = timeElaspsedMilliseconds / MILLISECONDS_IN_SECOND
        this.#player.update(timeElapsedSeconds)
    }

    #renderLoop() {
        if (this.#frozen.value) {
            return
        }
        window.requestAnimationFrame(currentTimestamp => {
            if (!this.#paused.value) {
                this.#performanceMeter.begin()
            }
            if (this.#previousFrameTimestamp === HAS_NOT_RENDERED_YET) {
                this.#previousFrameTimestamp = currentTimestamp
            }
            this.#renderer.render(this.#scene, this.#camera)
            if (this.#paused.value) {
                return this.#renderLoop()
            }
            const timeElaspsedMilliseconds = currentTimestamp - this.#previousFrameTimestamp
            this.#updateEntities(timeElaspsedMilliseconds)
            this.#thirdPersonCamera.update(timeElaspsedMilliseconds)
            this.#previousFrameTimestamp = currentTimestamp
            this.#renderCount.value++
            this.#performanceMeter.end()
            this.#renderLoop()
        })
    }

    enableDebugCamera() {
        this.#thirdPersonCamera.enabled = false


        const { x, y, z } = this.#thirdPersonCamera.lookAt
        this.#debugCamera.target.set(x, y, z)
        this.#debugCamera.update()
        // how can I merge these two into one state?
        this.#debugCamera.enabled = true
        this.#debugCameraEnabled.value = true
    }

    disableDebugCamera() {
        this.#debugCamera.enabled = false
        this.#debugCameraEnabled.value = false

        this.#thirdPersonCamera.reposition()
        this.#thirdPersonCamera.enabled = true
    }

    toggleDebugCamera() {
        if (this.#debugCamera.enabled) {
            this.disableDebugCamera()
        } else {
            this.enableDebugCamera()
        }
    }

    // this method doesn't allow anything in the game to render
    // even the camera; If you only want to freeze game entities
    // use .pause()
    #freeze() {
        this.#frozen.value = true
        this.disableDebugCamera()
    }

    #unfreeze() {
        if (!this.#frozen) {
            return
        }
        this.#frozen.value = false
        this.enableDebugCamera()
        this.#renderLoop()
    }

    toggleFreeze() {
        if (this.#frozen.value) {
            this.#unfreeze()
        } else {
            this.#freeze()
        }
    }

    togglePause() {
        this.#paused.value = !this.#paused.value
    }

    toggleMenu() {
        this.#showMenu.value = !this.#showMenu.value
    }

    run() {
        if (this.#paused.value) {
            return
        }
        this.#renderLoop()
    }
}
