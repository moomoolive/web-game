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
import { renderingThreadIdentity, mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"

export interface Thread {
    onmessage: Function
    postMessage: Function
    ping: () => void | Promise<void>
    terminate: () => void
    setFatalErrorHandler: (handler: (err: ErrorEvent) => void) => void
}

export class MainGameThread implements Thread {
    private worker = mainGameThreadConstructor()

    constructor() {
        this.worker.onerror = (err: ErrorEvent) => {
            console.error(renderingThreadIdentity(), " fatal error occurred on main thread, error:", err)
        }

        this.worker.onmessageerror = err => {
            console.error(
                renderingThreadIdentity(),
                "error occur when recieving message from main thread, error:", 
                err
            )
        }
    }

    setFatalErrorHandler(handler: (err: ErrorEvent) => void) {
        this.worker.onerror = handler
    }

    postMessage(handler: mainThreadCodes, payload: Float64Array) {
        const message: MainThreadMessage = { handler, payload }
        // pass payload by reference
        this.worker.postMessage(message, [payload.buffer])
    }

    set onmessage(handler: (message: MessageEvent<RenderingThreadMessage>) => void) {
        this.worker.onmessage = handler 
    }

    async ping(): Promise<void> {
        if (!this.worker.onmessage) {
            return Promise.reject()
        }
        const previousOnMessage = this.worker.onmessage
        const previousOnMessageError = this.worker.onmessageerror
        return new Promise((resolve, reject) => {
            this.worker.onmessage = (message: MessageEvent<RenderingThreadMessage>) => {
                this.worker.onmessage = previousOnMessage
                this.worker.onmessage(message)
                this.worker.onmessageerror = previousOnMessageError
                resolve()
            }
            this.worker.onmessageerror = () => {
                console.warn(renderingThreadIdentity(), "FATAL, main thread did not return ping")
                reject()
                this.worker.onmessage = previousOnMessage
                this.worker.onmessageerror = previousOnMessageError
            }
            const message: MainThreadMessage = {
                handler: "ping",
                payload: emptyPayload()
            }
            this.worker.postMessage(message, [message.payload.buffer])
        })
    }

    notifyKeyDown(event: KeyboardEvent) {
        this.postMessage("keyDown", new Float64Array([event.keyCode]))
    }

    notifyKeyUp(event: KeyboardEvent) {
        this.postMessage("keyUp", new Float64Array([event.keyCode]))
    }

    terminate() {
        this.worker.terminate()
    }
}

export class HelperGameThread implements Thread {
    private worker = helperGameThreadConstructor()
    busy = false

    id: Readonly<number>
    errorHandler: (message: MessageEvent<MainThreadMessage>) => void
    
    constructor(id: number) {
        this.id = id

        this.errorHandler = (message: MessageEvent<MainThreadMessage>) => {
            console.error(
                mainThreadIdentity(),
                "error occur when recieving message from worker", 
                this.id, 
                ", message:", 
                message
            )
        }
        this.worker.onmessageerror = this.errorHandler

        this.worker.onerror = err => {
            console.error(mainThreadIdentity(), "fatal error occurred on worker", this.id, ", err:", err)
        }
    }

    setFatalErrorHandler(handler: (err: ErrorEvent) => void) {
        this.worker.onerror = handler
    }
    
    postMessage(handler: helperGameThreadCodes, payload: Float64Array) {
        const message: HelperGameThreadMessage = { handler, payload }
        // pass payload by reference
        this.worker.postMessage(message, [payload.buffer])
    }
    
    async postMessagePromise(code: helperGameThreadCodes, payload: Float64Array): Promise<void> {
        return new Promise((resolve, reject) => {
            this.onmessage = message => {
                console.log(message)
                resolve()
                this.worker.onmessageerror = this.errorHandler
            }
            this.worker.onmessageerror = (message: MessageEvent<MainThreadMessage>) => {
                this.errorHandler(message)
                reject()
            }
            this.postMessage(code, payload)
        })
    }
    
    set onmessage(handler: (message: MessageEvent<MainThreadMessage>) => void) {
        this.worker.onmessage = handler 
    }
    
    ping() {
        this.postMessage("ping", new Float64Array([this.id]))  
    }

    terminate() {
        this.worker.terminate()
    }
}
