import * as three from "three"

export class ThirdPersonCamera {
    #camera: three.PerspectiveCamera
    #currentPosition = new three.Vector3()
    #currentLookAt = new three.Vector3()
    #playerModel: three.Group
    enabled = true

    constructor(camera: three.PerspectiveCamera, playerModel: three.Group) {
        this.#camera = camera
        this.#playerModel = playerModel
    }

    #calculateIdealOffset() {
        const idealOffset = new three.Vector3(-15, 20, -30)
        idealOffset.applyQuaternion(this.#playerModel.quaternion)
        idealOffset.add(this.#playerModel.position)
        return idealOffset
    }

    #calculateIdealLookAt() {
        const idealLookAt = new three.Vector3(0, 10, 50)
        idealLookAt.applyQuaternion(this.#playerModel.quaternion)
        idealLookAt.add(this.#playerModel.position)
        return idealLookAt
    }

    update(timeElapsedMilliseconds: number) {
        if (!this.enabled) {
            return
        }
        const idealOffset = this.#calculateIdealOffset()
        const idealLookAt = this.#calculateIdealLookAt()
        
        const CAMERA_ROTATION_TRANSITION_COEFFICENT = 1.0 - Math.pow(0.001, timeElapsedMilliseconds)

        this.#currentPosition.lerp(idealOffset, CAMERA_ROTATION_TRANSITION_COEFFICENT)
        this.#currentLookAt.lerp(idealLookAt, CAMERA_ROTATION_TRANSITION_COEFFICENT)

        this.#camera.position.copy(this.#currentPosition)
        this.#camera.lookAt(this.#currentLookAt)
    }
}
