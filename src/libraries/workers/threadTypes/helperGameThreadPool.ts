// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import helperGameThreadConstructor from "worker:@/libraries/workers/workerTypes/helperGameThread"
import { HelperGameThreadCodes, helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { sleepSeconds } from "@/libraries/misc"
import { 
    helperGameThreadStreamWithPayload,
} from "@/libraries/workers/threadStreams/streamCreators"
import { streamDebugInfo } from "@/libraries/workers/threadStreams/debugTools"
import { getThreadStreamHandler } from "@/libraries/workers/threadStreams/streamOperators"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { mainThreadLogger } from "@/libraries/workers/devTools/logging"

const logger = mainThreadLogger

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

        thread.onmessageerror = (message) => logger.error(
            "no onmessageerror handler has been set for game helper thread",
            id,
            ", message:",
            message
        )

        thread.onmessage = (message) => logger.log(
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
            thread.onmessage = (message: MessageEvent<Float64Array>) => {
                const handler = getThreadStreamHandler(message.data)
                /* if returned with error, allow thread to timeout */
                if (handler === mainThreadCodes.jobCouldNotComplete) {
                    return
                }
                logger.log("game helper thread", workerId, "responded to ping")
                resolve()
                this.threadWaitingIndicators[workerId] = THREAD_IS_READY_FOR_WORK
            }

            thread.onmessageerror = (message: MessageEvent<Float64Array>) => {
                logger.error("error occur when recieving message from game helper thread", workerId)
                logger.error("stream debug", streamDebugInfo(message.data, "helper-thread"))
                reject()
                this.threadWaitingIndicators[workerId] = THREAD_CANNOT_DO_WORK
            }

            const stream = helperGameThreadStreamWithPayload(
                helperGameThreadCodes.acknowledgePing,
                generateStreamId(),
                new Float64Array([workerId])
            )
            thread.postMessage(stream, [stream.buffer])
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
            handler: HelperGameThreadCodes, 
            payload: Float64Array,
            threadPool: Worker[],
            threadWaitingIndicators: boolean[]
        ): Promise<Float64Array> {

        const thread = threadPool[workerId]
        threadWaitingIndicators[workerId] = true
        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<Float64Array>) => {
                const handler = getThreadStreamHandler(message.data)
                if (handler === mainThreadCodes.jobCouldNotComplete) {
                    /* 
                        temporary solution,
                        what should probably happen is another retry,
                        or have this thread complete the work that 
                        the helper thread couldn't complete? 
                    */
                    reject()
                } else {
                    resolve(message.data)
                }
                threadWaitingIndicators[workerId] = false
            }

            thread.onmessageerror = (message: MessageEvent<Float64Array>) => {
                logger.error(
                    "error occur when recieving message from game helper thread", 
                    workerId
                )
                logger.error("stream debug", streamDebugInfo(message.data, "helper-thread"))
                reject()
                threadWaitingIndicators[workerId] = false
            }

            const stream = helperGameThreadStreamWithPayload(
                handler,
                generateStreamId(),
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

        (this.endOfReadyThreads as number) =- 1

        const threadWaitingIndicators = this.threadWaitingIndicators
        threadWaitingIndicators[lastAvailableThreadIndex] = true
        const thread = this.threadPool[lastAvailableThreadIndex]
        return new Promise((resolve, reject) => {
            thread.onmessage = (message: MessageEvent<Float64Array>) => {
                const handler = getThreadStreamHandler(message.data)
                if (handler === mainThreadCodes.jobCouldNotComplete) {
                    /* 
                        temporary solution,
                        what should probably happen is another retry,
                        or have this thread complete the work that 
                        the helper thread couldn't complete? 
                    */
                    reject()
                }
                onComplete(message.data)
                resolve()
                threadWaitingIndicators[lastAvailableThreadIndex] = false
            }

            thread.onmessageerror = (message: MessageEvent<Float64Array>) => {
                logger.error(
                    "error occur when recieving message from game helper thread", 
                    lastAvailableThreadIndex
                )
                logger.error("stream debug", streamDebugInfo(message.data, "helper-thread"))
                reject()
                threadWaitingIndicators[lastAvailableThreadIndex] = false
            }

            const stream = helperGameThreadStreamWithPayload(
                handler,
                generateStreamId(),
                payload
            )
            thread.postMessage(stream, [stream.buffer])
        })
    }
}