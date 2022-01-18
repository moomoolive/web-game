// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import mainGameThreadConstructor from "worker:@/libraries/workers/mainGameThread"
import { MainThreadMessage, RenderingThreadMessage, } from "./types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { emptyPayload } from "@/libraries/workers/common/index"

export class MainGameThread {
    #worker = mainGameThreadConstructor()

    constructor() {}

    postMessage(code: mainThreadCodes, payload: Float64Array) {
        const message: MainThreadMessage = { code, payload }
        // pass payload by reference
        this.#worker.postMessage(message, [payload.buffer])
        this.#worker.onerror = err => console.error(err)
        this.#worker.onmessageerror = err => console.error(err)
    }

    set onmessage(handler: (message: MessageEvent<RenderingThreadMessage>) => void) {
        this.#worker.onmessage = handler 
    }

    ping() {
        this.postMessage(mainThreadCodes.PING, emptyPayload())
    }

    notifyKeyDown(event: KeyboardEvent) {
        this.postMessage(mainThreadCodes.KEY_DOWN, new Float64Array([event.keyCode]))
    }

    notifyKeyUp(event: KeyboardEvent) {
        this.postMessage(mainThreadCodes.KEY_UP, new Float64Array([event.keyCode]))
    }

    terminate() {
        this.#worker.terminate()
    }
}
