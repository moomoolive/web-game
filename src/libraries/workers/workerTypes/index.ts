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

type PossibleMessages = RenderingThreadMessage | MainThreadMessage

export interface Thread<M=PossibleMessages> {
    postMessage: Function
    terminate: () => void
    setFatalErrorHandler: (handler: (err: ErrorEvent) => void) => void
    setOnMessageHandler: (handler: (message: MessageEvent<M>) => void) => void
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

    terminate() {
        this.worker.terminate()
    }

    setFatalErrorHandler(handler: (err: ErrorEvent) => void) {
        this.worker.onerror = handler
    }

    setOnMessageHandler(handler: (message: MessageEvent<RenderingThreadMessage>) => void) {
        this.worker.onmessage = handler 
    }

    postMessage(handler: mainThreadCodes, payload: Float64Array) {
        const message: MainThreadMessage = { handler, payload }
        // pass payload by reference
        this.worker.postMessage(message, [payload.buffer])
    }

    notifyKeyDown(event: KeyboardEvent) {
        this.postMessage("keyDown", new Float64Array([event.keyCode]))
    }

    notifyKeyUp(event: KeyboardEvent) {
        this.postMessage("keyUp", new Float64Array([event.keyCode]))
    }

    renderingPingAcknowledged() {
        this.postMessage("renderingPingAcknowledged", emptyPayload())
    }
}


export class HelperGameThread implements Thread {
    private worker = helperGameThreadConstructor()
    busy = false

    id: Readonly<number>
    
    constructor(id: number) {
        this.id = id

        this.worker.onmessageerror = (message: MessageEvent<MainThreadMessage>) => {
            console.error(
                mainThreadIdentity(),
                "error occur when recieving message from worker", 
                this.id, 
                ", message:", 
                message
            )
        }

        this.worker.onerror = err => {
            console.error(mainThreadIdentity(), "fatal error occurred on worker", this.id, ", err:", err)
        }
    }

    terminate() {
        this.worker.terminate()
    }

    setFatalErrorHandler(handler: (err: ErrorEvent) => void) {
        this.worker.onerror = handler
    }

    setOnMessageHandler(handler: (message: MessageEvent<MainThreadMessage>) => void) {
        this.worker.onmessage = handler 
    }
    
    postMessage(handler: helperGameThreadCodes, payload: Float64Array) {
        const message: HelperGameThreadMessage = { handler, payload }
        // pass payload by reference
        this.worker.postMessage(message, [payload.buffer])
    }
    
    async postMessageAsync(code: helperGameThreadCodes, payload: Float64Array): Promise<void> {
        if (!this.worker.onmessage) {
            return Promise.reject()
        }
        const previousOnMessage = this.worker.onmessage
        const previousOnMessageError = this.worker.onmessageerror
        return new Promise((resolve, reject) => {
            this.worker.onmessage = (message: MessageEvent<RenderingThreadMessage>) => {
                this.worker.onmessage = previousOnMessage
                this.worker.onmessageerror = previousOnMessageError
                this.worker.onmessage(message)
                resolve()
            }
            this.worker.onmessageerror = () => {
                console.warn(renderingThreadIdentity(), "FATAL, main thread did not return ping")
                reject()
                this.worker.onmessage = previousOnMessage
                this.worker.onmessageerror = previousOnMessageError
            }
            this.postMessage(code, payload)
        })
    }
    
    ping() {
        this.postMessage("acknowledgePing", new Float64Array([this.id]))  
    }

    async pingAsync(): Promise<void> {
        try {
            await this.postMessageAsync("acknowledgePing", new Float64Array([this.id]))
        } catch(err) {
            throw err
        }
    }
}

interface ThreadPoolOptions {
    threadCount: number
}

const MAXIMUM_THREADS = navigator.hardwareConcurrency

class HelperGameThreadPool {
    private threads: HelperGameThread[] = []
    private threadsWaiting = 0

    private requestedThreads = 0

    constructor(options: ThreadPoolOptions) {
        if (options.threadCount < 1) {
            console.warn(mainThreadIdentity(), "script requested thread pool to spawn 0 threads")
        }
        this.requestedThreads = options.threadCount
    }

    private spawnThreads() {
        const spawnCount = this.requestedThreads > MAXIMUM_THREADS ?
            MAXIMUM_THREADS : this.requestedThreads
        for (let i = 0; i < spawnCount; i++) {
        }
    }

    threadCount(): Readonly<number> {
        return this.threads.length
    }

    waitingThreadCount(): Readonly<number> {
        return this.threadsWaiting
    }

    async join(): Promise<void> {

    }
}
