import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader"
import * as three from "three"

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

    onKeyDown(keyCode: number) {
        switch (keyCode) {
            case 87: // w
                this._moveForward = true
                break
            case 65: // a
                this._moveLeft = true
                break
            case 83: // s
                this._moveBackward = true
                break
            case 68: // d
                this._moveRight = true
                break
        }
    }

    onKeyUp(keyCode: number) {
        switch (keyCode) {
            case 87: // w
                this._moveForward = false
                break
            case 65: // a
                this._moveLeft = false
                break
            case 83: // s
                this._moveBackward = false
                break
            case 68: // d
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
}

type AnimationStates = "idle" | "walk"

export class Player {
    #model = new three.Group()
    #animationMixer = new three.AnimationMixer(this.#model)
    #controller = new Controller(this.#model)
    #idleClip: null | three.AnimationClip = null
    #idleAction: null | three.AnimationAction = null
    #walkingClip: null | three.AnimationClip = null
    #walkingAction: null | three.AnimationAction = null
    #currentAnimation: AnimationStates = "idle"

    constructor() {}

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
                this.#animationMixer = new three.AnimationMixer(this.#model)
                animationLoader.load("/game/player/idle.fbx", animationFbx => {
                    this.#idleClip = animationFbx.animations[0]
                    this.#idleAction = this.#animationMixer.clipAction(this.#idleClip)
                    this.#idleAction.play()
                    resolve()
                })
                animationLoader.load("/game/player/walking.fbx", animationFbx => {
                    this.#walkingClip = animationFbx.animations[0]
                    this.#walkingAction = this.#animationMixer.clipAction(this.#walkingClip)
                    resolve()
                })
            }, onProgress, onError)
        })
    }

    onKeyDown(keyCode: number) {
        this.#controller.onKeyDown(keyCode)
    }

    onKeyUp(keyCode: number) {
        this.#controller.onKeyUp(keyCode)
    }

    async initialize(): Promise<void> {
        try {
            await this.#loadModel()
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
        // absolute garbage code needs to be refactored
        // but works!
        if (!this.#walkingAction || !this.#idleAction) {
            return
        }
        if (this.#controller._moveForward && this.#currentAnimation === "idle") {
            this.#walkingAction.time = 0.0
            this.#walkingAction.enabled = true
            this.#walkingAction.setEffectiveTimeScale(1.0)
            this.#walkingAction.setEffectiveWeight(1.0)
            this.#walkingAction.crossFadeFrom(this.#idleAction, 0.5, true)
            this.#walkingAction.play()
            this.#currentAnimation = "walk"
        } else if (!this.#controller._moveForward && this.#currentAnimation === "walk") {
            this.#idleAction.time = 0.0
            this.#idleAction.enabled = true
            this.#idleAction.setEffectiveTimeScale(1.0)
            this.#idleAction.setEffectiveWeight(1.0)
            this.#idleAction.crossFadeFrom(this.#walkingAction, 0.5, true)
            this.#idleAction.play()
            this.#currentAnimation = "idle"
        }
    }

    destroy() {
    }
}
