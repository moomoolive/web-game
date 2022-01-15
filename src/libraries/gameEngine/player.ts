import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader"
import * as three from "three"

let keyUpHandler = (e: KeyboardEvent) => {}
let keyDownHandler = (e: KeyboardEvent) => {}

class Controller {
    #target = new three.Group()
    _move = {
        forward: false
    }
    _moveLeft = false
    _moveRight = false
    _moveForward = false
    _moveBackward = false
    #decceleration = new three.Vector3(-0.0005, -0.0001, -5.0)
    #acceleration = new three.Vector3(1, 0.25, 50.0)
    #velocity = new three.Vector3(0, 0, 0)

    constructor(target: three.Group) {
        this.#target = target
    }

    initalize() {
        keyDownHandler = (event: KeyboardEvent) => this.onKeyDown(event)
        document.addEventListener("keydown", keyDownHandler)
        keyUpHandler = (event: KeyboardEvent) => this.onKeyUp(event)
        document.addEventListener("keyup", keyUpHandler)
    }

    onKeyDown(event: KeyboardEvent) {
        const input = event.key.toLowerCase()
        switch (input) {
            case "w":
                this._moveForward = true
                break
            case "a":
                this._moveLeft = true
                break
            case "s":
                this._moveBackward = true
                break
            case "d":
                this._moveRight = true
                break
        }
    }

    onKeyUp(event: KeyboardEvent) {
        const input = event.key.toLowerCase()
        switch (input) {
            case "w":
                this._moveForward = false
                break
            case "a":
                this._moveLeft = false
                break
            case "s":
                this._moveBackward = false
                break
            case "d":
                this._moveRight = false
                break
        }
    }

    update(timeElapsedSeconds: number) {
        const velocity = this.#velocity
        const frameDecceleration = new three.Vector3(
            velocity.x * this.#decceleration.x,
            velocity.y * this.#decceleration.y,
            velocity.z * this.#decceleration.z
        )
        frameDecceleration.multiplyScalar(timeElapsedSeconds)
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
            Math.abs(frameDecceleration.z), Math.abs(velocity.z))

        velocity.add(frameDecceleration)

        const _Q = new three.Quaternion()
        const _A = new three.Vector3()
        const _R = this.#target.quaternion.clone()

        if (this._moveForward) {
            velocity.z += this.#acceleration.z * timeElapsedSeconds
        }
        if (this._moveBackward) {
            velocity.z -= this.#acceleration.z * timeElapsedSeconds
        }
        if (this._moveLeft) {
            _A.set(0, 1, 0)
            _Q.setFromAxisAngle(_A, Math.PI * timeElapsedSeconds * this.#acceleration.y)
            _R.multiply(_Q)
        }
        if (this._moveRight) {
            _A.set(0, 1, 0)
            _Q.setFromAxisAngle(_A, -Math.PI * timeElapsedSeconds * this.#acceleration.y)
            _R.multiply(_Q)
        }

        this.#target.quaternion.copy(_R)

        const oldPosition = new three.Vector3()
        oldPosition.copy(this.#target.position)

        const forward = new three.Vector3(0, 0, 1)
        forward.applyQuaternion(this.#target.quaternion)
        forward.normalize()

        const sideways = new three.Vector3(1, 0, 0)
        sideways.applyQuaternion(this.#target.quaternion)
        sideways.normalize()

        sideways.multiplyScalar(velocity.x * timeElapsedSeconds)
        forward.multiplyScalar(velocity.z * timeElapsedSeconds)

        this.#target.position.add(forward)
        this.#target.position.add(sideways)

        oldPosition.copy(this.#target.position)
    }

    destroy() {
        document.removeEventListener("keydown", keyDownHandler)
        document.removeEventListener("keyup", keyUpHandler)
    }
}

export class Player {
    #model = new three.Group()
    #animationMixer = new three.AnimationMixer(this.#model)
    #controller = new Controller(this.#model)

    constructor() {

    }

    async #loadModel(): Promise<void> {
        const loader = new FBXLoader()
        return new Promise((resolve, reject) => {
            const onProgress = () => {}
            const onError = () => reject()
            loader.load("/game/player/t-pose.fbx", fbx => {
                fbx.scale.setScalar(0.1)
                fbx.traverse(c => c.castShadow = true)
                this.#model = fbx
                this.#controller = new Controller(this.#model)
                const animationLoader = new FBXLoader()
                animationLoader.load("/game/player/idle.fbx", animationFbx => {
                    this.#animationMixer = new three.AnimationMixer(this.#model)
                    const idle = this.#animationMixer.clipAction(animationFbx.animations[0])
                    idle.play()
                    resolve()
                })
            }, onProgress, onError)
        })
    }

    async initialize(): Promise<void> {
        try {
            await this.#loadModel()
            this.#controller.initalize()
        } catch(err) {
            throw err
        }
    }

    get model(): three.Group {
        return this.#model
    }

    update(timeElapsedSeconds: number) {
        this.#animationMixer.update(timeElapsedSeconds)
        this.#controller.update(timeElapsedSeconds)
    }

    destroy() {
        this.#controller.destroy()
    }
}
