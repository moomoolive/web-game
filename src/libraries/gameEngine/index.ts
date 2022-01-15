import * as three from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { Player } from "./player"
import { MILLISECONDS_IN_SECOND } from "@/consts"

const HAS_NOT_RENDERED_YET = -1

interface GameOptions {
    developmentMode: boolean
}

export class Game {
    #renderer = new three.WebGLRenderer()
    #camera = new three.PerspectiveCamera()
    #scene = new three.Scene()
    #paused = true
    #previousFrameTimestamp = HAS_NOT_RENDERED_YET
    #eagerUpdateHook = () => {}
    #addedToDOM = false
    #player = new Player()
    #developmentMode = true
    #sceneMaterials: three.Material[] = []
    #sceneGeometry: three.BufferGeometry[] = []

    constructor(options: GameOptions) {
        this.#developmentMode = options.developmentMode
        this.#renderer = this.#initRenderer()
        this.#camera = this.#initCamera()
        this.#scene = new three.Scene()
        this.#scene.add(this.#createDirectionalLight())
        const controls = new OrbitControls(this.#camera, this.#renderer.domElement)
        controls.target.set(0, 20, 0)
        controls.update()
        this.#loadWorldAssets()
        this.#basicWorldSetup()
        this.#addPlayer()
    }

    async #addPlayer() {
        try {
            await this.#player.initialize()
            this.#scene.add(this.#player.model)
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
                canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext()
                canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()
                document.removeChild(canvas)
            }
        }
        document.body.appendChild(this.#renderer.domElement)
        window.addEventListener("resize", () => this.#onWindowResize())
        this.#addedToDOM = true
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
        camera.position.set(75, 20, 0)
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
        this.pause()
        this.#player.destroy()
        // currently a memory leak occurs for the "#onWindowResize"
        // window listener
        //window.removeEventListener("resize", resizeCallback)
        document.body.removeChild(this.#renderer.domElement)
        this.#sceneGeometry.map(geometry => geometry.dispose())
        this.#sceneMaterials.map(material => material.dispose())
        this.#renderer.dispose()
    }

    setEagerUpdateHook(updateCallback: () => void) {
        this.#eagerUpdateHook = updateCallback
    }

    #updateEntities(timeElaspsedMilliseconds: number) {
        const timeElapsedSeconds = timeElaspsedMilliseconds / MILLISECONDS_IN_SECOND
        this.#player.update(timeElapsedSeconds)
    }

    #renderLoop() {
        if (this.#paused) {
            return
        }
        window.requestAnimationFrame(currentTimestamp => {
            if (this.#previousFrameTimestamp === HAS_NOT_RENDERED_YET) {
                this.#previousFrameTimestamp = currentTimestamp
            }
            this.#renderer.render(this.#scene, this.#camera)
            this.#updateEntities(currentTimestamp - this.#previousFrameTimestamp)
            this.#eagerUpdateHook()
            this.#renderLoop()
            this.#previousFrameTimestamp = currentTimestamp
        })
    }

    pause() {
        this.#paused = true
    }

    run() {
        if (!this.#paused) {
            return
        }
        this.#paused = false
        this.#renderLoop()
    }
}
