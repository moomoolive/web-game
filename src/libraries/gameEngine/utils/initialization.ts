import * as three from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

export function createDebugCamera(camera: three.PerspectiveCamera, rendererDomElement: HTMLCanvasElement): OrbitControls {
    const debugCamera = new OrbitControls(camera, rendererDomElement)
    debugCamera.target.set(0, 20, 0)
    debugCamera.update()
    debugCamera.enabled = false
    return debugCamera
} 


export function createRenderer(): three.WebGLRenderer {
    const renderer = new three.WebGLRenderer({ antialias: true })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = three.PCFSoftShadowMap
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    return renderer
}

export function createSceneCamera(): three.PerspectiveCamera {
    const fov = 60
    const aspect = 1920 / 1080
    const near = 1.0
    const far = 1000.0
    const camera = new three.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(25, 10, 25)
    return camera
}

export function createDirectionalLight(): three.DirectionalLight {
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

export function createWorldBackground(assetHrefs: string[]): three.CubeTexture {
    const loader = new three.CubeTextureLoader()
    const texture = loader.load([
        '/game/basic/posx.jpg',
        '/game/basic/negx.jpg',
        '/game/basic/posy.jpg',
        '/game/basic/negy.jpg',
        '/game/basic/posz.jpg',
        '/game/basic/negz.jpg',
    ])
    return texture
}

interface MeshElements {
    mesh: three.Mesh,
    geometry: three.BufferGeometry,
    material: three.Material
}

export function createWorldPlane(): MeshElements {
    const geometry = new three.PlaneBufferGeometry(100, 100, 10, 10)
    const material = new three.MeshStandardMaterial({ color: 0xFFFFFF })
    const plane = new three.Mesh(geometry, material)
    plane.castShadow = false
    plane.receiveShadow = false
    plane.rotation.x = -Math.PI / 2
    return { mesh: plane, material, geometry }
}

export class EngineIndicator {
    private static ENGINE_TIMEOUT_MILLISECONDS = 5_000
    private static ENGINE_FAILURE_JOB_NOT_SCHEDULED = -1

    private reject = (value: boolean) => {}
    private resolve = (value: boolean) => {}
    private isReady = false
    private engineFailureJobId = EngineIndicator.ENGINE_FAILURE_JOB_NOT_SCHEDULED

    awaitReadySignal(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.reject = reject
            this.resolve = resolve
            this.engineFailureJobId = window.setTimeout(() => {
                if (!this.isReady) {
                    this.reject(false)
                }
            }, EngineIndicator.ENGINE_TIMEOUT_MILLISECONDS)
        })
    }

    setReady() {
        window.clearTimeout(this.engineFailureJobId)
        this.resolve(true)
        this.isReady = true
    }
}
