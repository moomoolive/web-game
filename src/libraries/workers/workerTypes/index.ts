// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import mainGameThreadConstructor from "worker:@/libraries/workers/workerTypes/mainGameThread"
import { MainThreadMessage, RenderingThreadMessage, HelperGameThreadMessage } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { emptyPayload } from "@/libraries/workers/common/index"
import { helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import helperGameThreadConstructor from "worker:@/libraries/workers/workerTypes/helperGameThread"

export interface Thread {
    onmessage: Function
    postMessage: Function
    ping: () => void
    terminate: () => void
}

export class MainGameThread implements Thread {
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


export class HelperGameThread implements Thread {
    #worker = helperGameThreadConstructor()
    busy = false
    id: Readonly<number>
    
    constructor(id: number) {
        this.id = id
        this.#worker.onerror = err => console.error("worker", this.id, "exception", err)
        this.#worker.onmessageerror = err => console.error(err)
    }
    
    postMessage(code: helperGameThreadCodes, payload: Float64Array) {
        const message: HelperGameThreadMessage = { code, payload }
        // pass payload by reference
        this.#worker.postMessage(message, [payload.buffer])
    }
    
    async postMessagePromise(code: helperGameThreadCodes, payload: Float64Array): Promise<void> {
        return new Promise((resolve, reject) => {
            this.onmessage = message => {
                console.log(message)
                resolve()
            }
            this.#worker.onmessageerror = messageError => reject()
            this.#worker.onerror = error => reject()
            this.postMessage(code, payload)
        })
    }
    
    set onmessage(handler: (message: MessageEvent<MainThreadMessage>) => void) {
        this.#worker.onmessage = handler 
    }
    
    ping() {
        this.postMessage(helperGameThreadCodes.PING, new Float64Array([this.id]))  
    }

    terminate() {
        this.#worker.terminate()
    }
}
