// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import mainGameThreadConstructor from "worker:@/libraries/workers/mainGameThread"
import { MainThreadMessage, RenderingThreadMessage, } from "./types"
import { MAIN_THREAD_CODES } from "@/libraries/workers/messageCodes/mainThread"

export class MainGameThread {
    #worker = mainGameThreadConstructor()

    constructor() {}

    postMessage(code: MAIN_THREAD_CODES, payload: Float64Array) {
        // pass payload by reference
        const message: MainThreadMessage = { code, payload }
        this.#worker.postMessage(message, [payload.buffer])
    }

    set onmessage(handler: (message: MessageEvent<RenderingThreadMessage>) => void) {
        this.#worker.onmessage = handler 
    }

    terminate() {
        this.#worker.terminate()
    }
}
