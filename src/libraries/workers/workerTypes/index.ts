// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import mainGameThreadConstructor from "worker:@/libraries/workers/workerTypes/mainGameThread"
import { 
    MainThreadCodes,
    mainThreadCodes
} from "@/libraries/workers/messageCodes/mainThread"
import { HelperGameThreadCodes, helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import helperGameThreadConstructor from "worker:@/libraries/workers/workerTypes/helperGameThread"
import { renderingThreadIdentity, mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { sleepSeconds } from "@/libraries/misc"
import { 
    mainThreadStreamFull,
    mainThreadStreamWithPayload,
    helperGameThreadStreamWithPayload
} from "@/libraries/workers/threadStreams/index"

export class MainGameThread {
    private worker = mainGameThreadConstructor()
    private threadIdCounter = 0

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

    generateThreadId(): number {
        const id = this.threadIdCounter
        this.threadIdCounter++
        return id
    }

    setFatalErrorHandler(handler: (err: ErrorEvent) => void) {
        this.worker.onerror = handler
    }

    setOnMessageHandler(handler: (message: MessageEvent<Float64Array>) => void) {
        this.worker.onmessage = handler 
    }

    postMessage(threadStream: Float64Array) {
        // pass payload by reference
        this.worker.postMessage(threadStream, [threadStream.buffer])
    }

    notifyKeyDown(event: KeyboardEvent) {
        const stream = mainThreadStreamWithPayload(
            mainThreadCodes.keyDown,
            this.generateThreadId(),
            new Float64Array([event.keyCode])
        )
        this.postMessage(stream)
    }

    notifyKeyUp(event: KeyboardEvent) {
        const stream = mainThreadStreamWithPayload(
            mainThreadCodes.keyUp,
            this.generateThreadId(),
            new Float64Array([event.keyCode])
        )
        this.postMessage(stream)
    }

    renderingPingAcknowledged(pingStreamId: number) {
        const stream = mainThreadStreamFull(
            mainThreadCodes.renderingPingAcknowledged,
            this.generateThreadId(),
            pingStreamId
        )
        this.postMessage(stream)
    }
}

interface ThreadPoolOptions {
    threadCount: number
}

// can only be used inside a worker file
export class HelperGameThreadPool {
    private static MAXIMUM_THREADS = navigator.hardwareConcurrency
    private static MAX_PING_TIMEOUT_SECONDS = 2

    private threadPool: Worker[] = []
    private threadWaitingIndicators: boolean[] = []
    private requestedThreads = 0
    private endOfReadyThreads = 0
    private streamIdCounter = 0

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

    generateStreamId(): number {
        const id = this.streamIdCounter
        this.streamIdCounter++
        return id
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

            thread.onmessageerror = (message: MessageEvent<Float64Array>) => {
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
            const stream = helperGameThreadStreamWithPayload(
                helperGameThreadCodes.acknowledgePing,
                this.generateStreamId(),
                new Float64Array([workerId])
            )
            thread.postMessage(stream, [stream.buffer])
        })
    }

    async initialize(): Promise<void> {
        this.threadPool.forEach((_, index) => this.pingThread(index))
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
        this.endOfReadyThreads = this.threadPool.length    
    }

    private createJob(
            workerId: number, 
            handler: HelperGameThreadCodes, 
            payload: Float64Array,
            threadPool: Worker[],
            threadWaitingIndicators: boolean[]
        ): Promise<Float64Array> {

        const thread = threadPool[workerId]
        threadWaitingIndicators[workerId] = true
        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<Float64Array>) => {
                resolve(message.data)
                threadWaitingIndicators[workerId] = false
            }

            thread.onmessageerror = (message: MessageEvent<Float64Array>) => {
                console.error(
                    mainThreadIdentity(),
                    "error occur when recieving message from game helper thread", 
                    workerId, 
                    ", message:", 
                    message
                )
                reject()
                threadWaitingIndicators[workerId] = false
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
                threadWaitingIndicators[workerId] = false
            }
            const stream = helperGameThreadStreamWithPayload(
                handler,
                this.generateStreamId(),
                payload
            )
            thread.postMessage(stream, [stream.buffer])
        })
    }

    // distributes an inputted job over all available threads
    // and returns a promise that fulfills when all threads
    // are finished (similar to calling "join" on all threads) 
    spawnParallelJob(handler: HelperGameThreadCodes, payload: Float64Array): Promise<Float64Array[]> {
        const jobPromises = []
        const availableThreads = this.endOfReadyThreads
        if (availableThreads < 1) {
            throw new Error(mainThreadIdentity() + " no threads available for attempted blocking job spawn")
        }
        const executorFunction = this.createJob
        const threadPool = this.threadPool
        const threadWaitingIndicators = this.threadWaitingIndicators
        for (let i = 0; i < availableThreads; i++) {
            const promise = executorFunction(
                i, 
                handler, 
                payload,
                threadPool,
                threadWaitingIndicators
            )
            jobPromises.push(promise)
        }
        return Promise.all(jobPromises)
    }

    // creates a job for one thread and marks it as busy.
    // note: using this too often lowers the effectiveness
    // of "spawnParallelJob" as distributed jobs will have one
    // less thread to work with
    spawnJob(
        handler: HelperGameThreadCodes, 
        payload: Float64Array,
        onComplete: (data: Float64Array) => void
    ): Promise<void> {
        const lastAvailableThreadIndex = this.endOfReadyThreads - 1
        const noThreadsAvailable = lastAvailableThreadIndex < 0
        if (noThreadsAvailable) {
            throw Error(mainThreadIdentity() + " no threads available for attempted job spawn")
        }
        this.endOfReadyThreads--
        const threadWaitingIndicators = this.threadWaitingIndicators
        threadWaitingIndicators[lastAvailableThreadIndex] = true
        const thread = this.threadPool[lastAvailableThreadIndex]
        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<Float64Array>) => {
                onComplete(message.data)
                resolve()
                threadWaitingIndicators[lastAvailableThreadIndex] = false
            }

            thread.onmessageerror = (message: MessageEvent<Float64Array>) => {
                console.error(
                    mainThreadIdentity(),
                    "error occur when recieving message from game helper thread", 
                    lastAvailableThreadIndex, 
                    ", message:", 
                    message
                )
                reject()
                threadWaitingIndicators[lastAvailableThreadIndex] = false
            }

            thread.onerror = err => {
                console.error(
                    mainThreadIdentity(), 
                    "fatal error occurred on game helper thread", 
                    lastAvailableThreadIndex, 
                    ", err:", 
                    err
                )
                reject()
                threadWaitingIndicators[lastAvailableThreadIndex] = false
            }
            const stream = helperGameThreadStreamWithPayload(
                handler,
                this.generateStreamId(),
                payload
            )
            thread.postMessage(stream, [stream.buffer])
        })
    }
}
