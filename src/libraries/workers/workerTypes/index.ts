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
import { sleepSeconds } from "@/libraries/misc"

export class MainGameThread {
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


export class HelperGameThread {
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

// can only be used inside a worker file
export class HelperGameThreadPool {
    private static MAXIMUM_THREADS = navigator.hardwareConcurrency
    private static MAX_PING_TIMEOUT_SECONDS = 3

    private threadPool: Worker[] = []
    private threadWaitingIndicators: boolean[] = []
    private requestedThreads = 0
    private endOfReadyWorkers = 0

    constructor(options: ThreadPoolOptions) {
        if (options.threadCount < 1) {
            console.warn(
                mainThreadIdentity(),
                "thread pool spawning 0 threads, this may be an error"
            )
        }
        this.requestedThreads = options.threadCount
        this.spawnPool()
    }

    threadCount(): Readonly<number> {
        return this.threadPool.length
    }

    private spawnPool() {
        const max = HelperGameThreadPool.MAXIMUM_THREADS
        const requested = this.requestedThreads
        const spawnCount = requested > max ? max : requested
        const HAS_NOT_CONFIRMED_READINESS = true
        for (let i = 0; i < spawnCount; i++) {
            const thread = this.spawnThread(i)
            this.threadPool.push(thread)
            this.threadWaitingIndicators.push(HAS_NOT_CONFIRMED_READINESS)
        }
    }

    private spawnThread(id: number): Worker {
        const thread = helperGameThreadConstructor()
        thread.onerror = err => console.error(
            mainThreadIdentity(),
            "no onerror handler has been set for game helper thread",
            id,
            ", err:",
            err
        )

        thread.onmessageerror = (message) => console.error(
            mainThreadIdentity(),
            "no onmessageerror handler has been set for game helper thread",
            id,
            ", message:",
            message
        )

        thread.onmessage = (message) => console.log(
            mainThreadIdentity(),
            "no onmessage handler has been set for game helper thread",
            id,
            ", message:",
            message
        ) 
        return thread
    }

    private pingThread(workerId: number): Promise<void> {
        const thread = this.threadPool[workerId]
        this.threadWaitingIndicators[workerId] = true
        const THREAD_IS_READY_FOR_WORK = false
        const THREAD_CANNOT_DO_WORK = true
        return new Promise((resolve, reject) => {
            thread.onmessage = () => {
                console.log(
                    mainThreadIdentity(), 
                    "game helper thread", 
                    workerId, 
                    "responded to ping"
                )
                resolve()
                this.threadWaitingIndicators[workerId] = THREAD_IS_READY_FOR_WORK
            }

            thread.onmessageerror = (message: MessageEvent<MainThreadMessage>) => {
                console.error(
                    mainThreadIdentity(),
                    "error occur when recieving message from game helper thread", 
                    workerId, 
                    ", message:", 
                    message
                )
                reject()
                this.threadWaitingIndicators[workerId] = THREAD_CANNOT_DO_WORK
            }

            thread.onerror = err => {
                console.error(
                    mainThreadIdentity(), 
                    "fatal error occurred when pinging game helper thread", 
                    workerId, 
                    ", err:", 
                    err
                )
                reject()
                this.threadWaitingIndicators[workerId] = THREAD_CANNOT_DO_WORK
            }
            const payload = new Float64Array([workerId])
            const message: HelperGameThreadMessage = { handler: "acknowledgePing", payload }
            thread.postMessage(message, [payload.buffer])
        })
    }

    async initialize(): Promise<void> {
        this.threadPool.forEach((_, i) => this.pingThread(i))
        await sleepSeconds(HelperGameThreadPool.MAX_PING_TIMEOUT_SECONDS)

        for (let i = this.threadWaitingIndicators.length - 1; i >= 0; i--) {
            const notWaiting = !this.threadWaitingIndicators[i]
            if (notWaiting) {
                continue
            }
            // essentially if thread hasn't responded to initialization "ping"
            // it's considered unusable and is removed from thread pool 
            console.warn(
                mainThreadIdentity(),
                "game helper thread", 
                i, 
                "didn't respond to initalization ping. Removing from thread pool"
            )
            this.threadPool[i].terminate()
            this.threadPool.splice(i, 1)
            this.threadWaitingIndicators.splice(i, 1)
        }

        if (this.threadPool.length < 1) {
            console.warn(
                mainThreadIdentity(),
                "no threads have been correctly initialized"
            )
        }
        this.endOfReadyWorkers = this.threadPool.length    
    }

    private createJob(workerId: number, handler: helperGameThreadCodes, payload: Float64Array): Promise<MainThreadMessage> {
        const thread = this.threadPool[workerId]
        this.threadWaitingIndicators[workerId] = true
        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<MainThreadMessage>) => {
                resolve(message.data)
                this.threadWaitingIndicators[workerId] = false
            }

            thread.onmessageerror = (message: MessageEvent<MainThreadMessage>) => {
                console.error(
                    mainThreadIdentity(),
                    "error occur when recieving message from game helper thread", 
                    workerId, 
                    ", message:", 
                    message
                )
                reject()
                this.threadWaitingIndicators[workerId] = false
            }

            thread.onerror = err => {
                console.error(
                    mainThreadIdentity(), 
                    "fatal error occurred on game helper thread", 
                    workerId, 
                    ", err:", 
                    err
                )
                reject()
                this.threadWaitingIndicators[workerId] = false
            }

            const message: HelperGameThreadMessage = { handler, payload }
            thread.postMessage(message, [payload.buffer])
        })
    }

    // distributes an inputted job over all available threads
    // and returns a promise that fulfills when all threads
    // are finished (similar to calling "join" on all threads) 
    spawnBlockingJob(handler: helperGameThreadCodes, payload: Float64Array): Promise<MainThreadMessage[]> {
        const jobPromises = []
        const threads = this.threadPool.length
        for (let i = 0; i < threads; i++) {
            const promise = this.createJob(i, handler, payload)
            jobPromises.push(promise)
        }
        return Promise.all(jobPromises)
    }
}
