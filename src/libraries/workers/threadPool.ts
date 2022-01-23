// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import helperGameThreadConstructor from "worker:@/libraries/workers/workerTypes/helperGameThread"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { 
    MainThreadHelperMessage, 
    HelperGameThreadMessage, 
    HelperGameThreadHandler 
} from "@/libraries/workers/types"
import { mainThread } from "@/libraries/workers/workerComponents/mainThread/consts"

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

const MAXIMUM_THREADS = navigator.hardwareConcurrency
let messageIdCount = 0

interface ThreadPoolOptions {
    threadCount: number
}

export class WorkerPool {
    private pool: Worker[] = []

    readonly totalThreads = 0
    readonly requestedThreads = 0
    readonly waitingOnJobs = false

    constructor({ threadCount }: ThreadPoolOptions) {
        if (threadCount < 1) {
            logger.warn("thread pool spawning 0 threads, this may be an error")
        }

        (this.requestedThreads as number) = threadCount
        
        const spawnCount = threadCount > MAXIMUM_THREADS ? MAXIMUM_THREADS : threadCount
        for (let i = 0; i < spawnCount; i++) {
            const id = i
            const worker = helperGameThreadConstructor()
            worker.onerror = err => logger.error(
                "fatal error occurred when pinging game helper thread", id, ", err:",  err
            )
            worker.onmessageerror = message => logger.error(
                "no onmessageerror handler has been set for game helper thread",
                id,
                ", message:",
                message
            )
            worker.onmessage = message => logger.log(
                "no onmessage handler has been set for game helper thread",
                id,
                ", message:",
                message
            )
            this.pool.push(worker)
        }
        (this.totalThreads as number) = this.pool.length
    }

    terminate() {
        this.pool.forEach(worker => worker.terminate())
    }

    private createJob(
            worker: Worker,
            workerId: number, 
            handler: HelperGameThreadHandler, 
            payload: Float64Array,
            threadPool: Worker[],
            rejectOnErr: boolean
        ): Promise<Float64Array> {
        return new Promise((resolve, reject) => {
            worker.onmessage = (message: MessageEvent<MainThreadHelperMessage>) => {
                const { handler, payload } = message.data
                if (handler !== "jobCouldNotComplete") {
                    resolve(payload)
                }

                if (rejectOnErr) {
                    return reject()
                }
                const previousOnMessage = worker.onmessage
                const previousOnMessageError = worker.onmessageerror
                worker.terminate()
                const newWorker = helperGameThreadConstructor()
                newWorker.onmessage = previousOnMessage
                newWorker.onmessageerror = previousOnMessageError
                threadPool[workerId] = newWorker
                const reinitializationMessage: HelperGameThreadMessage = {
                    handler: "acknowledgePing",
                    payload: new Float64Array(),
                    meta: [workerId.toString()],
                    id: mainThread.reinitalizedWorkerMessageId
                }
                newWorker.postMessage(reinitializationMessage, [reinitializationMessage.payload.buffer])
                /* 
                    if failed, do job on main thread,
                    and create new worker
                    to be implemented
                */
                resolve(payload)
            }

            worker.onmessageerror = (message: MessageEvent<MainThreadHelperMessage>) => {
                logger.error(
                    "error occur when recieving message from game helper thread", 
                    workerId
                )
                logger.error("message:", message.data)
                reject()
            }

            const id = messageIdCount
            messageIdCount++
            const message: HelperGameThreadMessage = {
                handler,
                payload,
                meta: [workerId.toString()],
                id
            }
            worker.postMessage(message, [payload.buffer])
        })
    }

    // distributes an inputted job over all available threads
    // and returns a promise that fulfills when all threads
    // are finished (similar to calling "join" on all threads)
    // if none are available, main thread will do all of work
    async spawnParallelJob(handler: HelperGameThreadHandler, payload: Float64Array, rejectOnErr: boolean): Promise<Float64Array[]> {
        (this.waitingOnJobs as boolean) = true
        
        const threadPool = this.pool
        const jobPromises = []
        const executorFunction = this.createJob
        for (let i = 0; i < threadPool.length; i++) {
            /* payload needs to be sliced among all workers */
            const promise = executorFunction(
                threadPool[i],
                i,
                handler,
                // temporary 
                payload.slice(),
                threadPool,
                rejectOnErr
            )
            jobPromises.push(promise)
        }
        try {
            const res = await Promise.all(jobPromises)
            return res
        } catch(err) {
            throw err
        } finally {
            (this.waitingOnJobs as boolean) = false
        }
    }

    async initialize(): Promise<void> {
        try {
            const workerRes = await this.spawnParallelJob("acknowledgePing", new Float64Array(), true)
            workerRes.forEach((_, workerId) => logger.log("game helper thread", workerId, "responded to ping"))
        } catch(err) {
            throw err
        }
    }
}
