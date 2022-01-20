import * as three from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

const HAS_NOT_RENDERED_YET = -1

export class World {
    #renderer = new three.WebGLRenderer()
    #camera = new three.PerspectiveCamera()
    #scene = new three.Scene()
    #paused = true
    #previousFrameTimestamp = HAS_NOT_RENDERED_YET
    #eagerUpdateHook = () => {}
    #resizeCallback = () => {}

    constructor() {
        this.#renderer = this.#initRenderer()
        document.body.appendChild(this.#renderer.domElement)
        this.#camera = this.#initCamera()
        this.#scene = new three.Scene()
        this.#scene.add(this.#createDirectionalLight())
        const controls = new OrbitControls(this.#camera, this.#renderer.domElement)
        controls.target.set(0, 20, 0)
        controls.update()
        const resizeCallback = () => this.#onWindowResize()
        window.addEventListener("resize", resizeCallback)
        this.#resizeCallback = resizeCallback
        this.#loadWorldAssets()
        this.#basicWorldSetup()
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
        const plane = new three.Mesh(
            new three.PlaneBufferGeometry(100, 100, 10, 10),
            new three.MeshStandardMaterial({ color: 0xFFFFFF })
        )
        plane.castShadow = false
        plane.receiveShadow = false
        plane.rotation.x = -Math.PI / 2
        this.#scene.add(plane)

        const box = new three.Mesh(
            new three.BoxBufferGeometry(2, 2, 2),
            new three.MeshStandardMaterial({ color: 0xFFFFFF })
        )
        box.position.set(0, 1, 0)
        box.castShadow = true
        box.receiveShadow = true
        this.#scene.add(box)

        for (let x = -8; x < 8; x++) {
            for (let y = -8; y < 8; y++) {
                const box = new three.Mesh(
                    new three.BoxBufferGeometry(2, 2, 2),
                    new three.MeshStandardMaterial({ color: 0x808080 })
                )
                box.position.set(
                    Math.random() + x * 5, 
                    Math.random() * 4.0 + 2.0, 
                    Math.random() + y * 5
                )
                box.castShadow = true
                box.receiveShadow = true
                this.#scene.add(box)
            }
        }
    }

    #onWindowResize() {
        this.#camera.aspect = window.innerWidth / window.innerHeight
        this.#camera.updateProjectionMatrix()
        this.#renderer.setSize(window.innerWidth, window.innerHeight)
    }

    destroy() {
        this.pause()
        window.removeEventListener("resize", this.#resizeCallback)
        document.body.removeChild(this.#renderer.domElement)
    }

    setEagerUpdateHook(updateCallback: () => void) {
        this.#eagerUpdateHook = updateCallback
    }

    #renderLoop() {
        if (this.#paused) {
            return
        }
        window.requestAnimationFrame(t => {
            if (this.#previousFrameTimestamp === HAS_NOT_RENDERED_YET) {
                this.#previousFrameTimestamp = t
            }
            this.#renderer.render(this.#scene, this.#camera)
            this.#eagerUpdateHook()
            this.#renderLoop()
            this.#previousFrameTimestamp = t
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
