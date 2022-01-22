// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import helperGameThreadConstructor from "worker:@/libraries/workers/workerTypes/helperGameThread"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { sleepSeconds } from "@/libraries/misc"
import { MainThreadHelperMessage, HelperGameThreadMessage, HelperGameThreadHandler } from "@/libraries/workers/types"

const logger = {
    log(...args: any[]) {
        console.log(mainThreadIdentity(), ...args)
    },
    warn(...args: any[]) {
        console.warn(mainThreadIdentity(), ...args)
    },
    error(...args: any[]) {
        console.error(mainThreadIdentity(), ...args)
    },
} as const

let streamCounterId = 0

function generateStreamId(): number {
    const id = streamCounterId
    streamCounterId++
    return id
}

interface ThreadPoolOptions {
    threadCount: number
}

// can only be used inside a worker file
export class HelperGameThreadPool {
    private static MAXIMUM_THREADS = navigator.hardwareConcurrency
    private static MAX_PING_TIMEOUT_SECONDS = 1

    private threadPool: Worker[] = []
    private threadWaitingIndicators: boolean[] = []
    private requestedThreads = 0
    /* readonly for public */
    readonly endOfReadyThreads = 0

    constructor(options: ThreadPoolOptions) {
        if (options.threadCount < 1) {
            logger.warn("thread pool spawning 0 threads, this may be an error")
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
        thread.onerror = err => logger.error(
            "fatal error occurred when pinging game helper thread", id, ", err:",  err
        )

        thread.onmessageerror = message => logger.error(
            "no onmessageerror handler has been set for game helper thread",
            id,
            ", message:",
            message
        )

        thread.onmessage = message => logger.log(
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
            thread.onmessage = (message: MessageEvent<MainThreadHelperMessage>) => {
                const { handler } = message.data
                /* if returned with error, allow thread to timeout */
                if (handler === "jobCouldNotComplete") {
                    return
                }
                logger.log("game helper thread", workerId, "responded to ping")
                resolve()
                this.threadWaitingIndicators[workerId] = THREAD_IS_READY_FOR_WORK
            }

            thread.onmessageerror = (message: MessageEvent<MainThreadHelperMessage>) => {
                logger.error("error occur when recieving message from game helper thread", workerId)
                logger.error("message:", message.data)
                reject()
                this.threadWaitingIndicators[workerId] = THREAD_CANNOT_DO_WORK
            }

            const payload = new Float64Array([workerId])
            const message: HelperGameThreadMessage = {
                payload,
                handler: "acknowledgePing",
                meta: [],
                id: generateStreamId()
            }
            thread.postMessage(message, [payload.buffer])
        })
    }

    async initialize(): Promise<void> {
        const threadPool = this.threadPool
        const threadWaitingIndicators = this.threadWaitingIndicators

        threadPool.forEach((_, index) => this.pingThread(index))
        await sleepSeconds(HelperGameThreadPool.MAX_PING_TIMEOUT_SECONDS)

        for (let i = threadWaitingIndicators.length - 1; i >= 0; i--) {
            const notWaiting = !threadWaitingIndicators[i]
            if (notWaiting) {
                continue
            }
            // essentially if thread hasn't responded to initialization "ping"
            // it's considered unusable and is removed from thread pool 
            logger.warn(
                "game helper thread", 
                i, 
                "didn't respond to initalization ping. Removing from thread pool"
            )
            threadPool[i].terminate()
            threadPool.splice(i, 1)
            threadWaitingIndicators.splice(i, 1)
        }

        if (threadPool.length < 1) {
            logger.warn("no threads have been correctly initialized")
        }
        (this.endOfReadyThreads as number) = threadPool.length    
    }

    private createJob(
            workerId: number, 
            handler: HelperGameThreadHandler, 
            payload: Float64Array,
            threadPool: Worker[],
            threadWaitingIndicators: boolean[]
        ): Promise<Float64Array> {

        const thread = threadPool[workerId]
        threadWaitingIndicators[workerId] = true
        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<MainThreadHelperMessage>) => {
                const { handler, payload } = message.data
                if (handler === "jobCouldNotComplete") {
                    /* 
                        temporary solution,
                        what should probably happen is another retry,
                        or have this thread complete the work that 
                        the helper thread couldn't complete? 
                    */
                    reject()
                } else {
                    resolve(payload)
                }
                threadWaitingIndicators[workerId] = false
            }

            thread.onmessageerror = (message: MessageEvent<MainThreadHelperMessage>) => {
                logger.error(
                    "error occur when recieving message from game helper thread", 
                    workerId
                )
                logger.error("message:", message.data)
                reject()
                threadWaitingIndicators[workerId] = false
            }

            const message: HelperGameThreadMessage = {
                handler,
                payload,
                meta: [],
                id: generateStreamId()
            }
            thread.postMessage(message, [payload.buffer])
        })
    }

    // distributes an inputted job over all available threads
    // and returns a promise that fulfills when all threads
    // are finished (similar to calling "join" on all threads) 
    spawnParallelJob(handler: HelperGameThreadHandler, payload: Float64Array): Promise<Float64Array[]> {
        const jobPromises = []
        let workersForJob = 0
        const executorFunction = this.createJob
        const threadPool = this.threadPool
        const threadWaitingIndicators = this.threadWaitingIndicators
        for (let i = 0; i < threadPool.length; i++) {
            const isWaitingOnJob = threadWaitingIndicators[i]
            if (isWaitingOnJob) {
                continue
            }

            const promise = executorFunction(
                i, 
                handler, 
                payload,
                threadPool,
                threadWaitingIndicators
            )
            jobPromises.push(promise)
            workersForJob++
        }
        
        if (workersForJob < 1) {
            logger.warn("there seems to be no workers available for job, this is probably an error")
        }

        return Promise.all(jobPromises)
    }

    // creates a job for one thread and marks it as busy.
    // note: using this too often lowers the effectiveness
    // of "spawnParallelJob" as distributed jobs will have one
    // less thread to work with
    spawnJob(
        handler: HelperGameThreadHandler, 
        payload: Float64Array,
        onComplete: (data: MainThreadHelperMessage) => void
    ): Promise<void> {
        const threadWaitingIndicators = this.threadWaitingIndicators
        const availableWorkerIndex = threadWaitingIndicators.findIndex(isWaiting => !isWaiting)

        if (availableWorkerIndex === -1) {
            throw Error(mainThreadIdentity() + " no threads available for attempted job spawn")
        }

        threadWaitingIndicators[availableWorkerIndex] = true
        const thread = this.threadPool[availableWorkerIndex]

        const onPromiseReturn = () => {
            threadWaitingIndicators[availableWorkerIndex] = false
        }

        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<MainThreadHelperMessage>) => {
                const { handler } = message.data
                if (handler === "jobCouldNotComplete") {
                    /* 
                        temporary solution,
                        what should probably happen is another retry,
                        or have this thread complete the work that 
                        the helper thread couldn't complete? 
                    */
                    reject()
                }
                onComplete(message.data)
                onPromiseReturn()
                resolve()
            }

            thread.onmessageerror = (message: MessageEvent<MainThreadHelperMessage>) => {
                logger.error(
                    "error occur when recieving message from game helper thread", 
                    availableWorkerIndex
                )
                logger.error("message:", message.data)
                onPromiseReturn()
                reject()
            }

            const message: HelperGameThreadMessage = {
                handler,
                payload,
                meta: [],
                id: generateStreamId()
            }
            thread.postMessage(message, [payload.buffer])
        })
    }
}