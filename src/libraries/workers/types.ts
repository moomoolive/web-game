import mainGameThreadConstructor from "worker:@/libraries/workers/workerTypes/mainGameThread"
import { MainThreadCodes } from "./messageCodes/mainThread"
import { RenderingThreadCodes } from "./messageCodes/renderingThread"
import { HelperGameThreadCodes } from "./messageCodes/helperGameThread"

export type WebWorkerConstructor = typeof mainGameThreadConstructor

interface ThreadCommunication<TARGET_THREAD_CODES> {
    handler: TARGET_THREAD_CODES,
    payload: Float64Array
}

export type MainThreadMessage = ThreadCommunication<MainThreadCodes>
export type RenderingThreadMessage = ThreadCommunication<RenderingThreadCodes>
export type HelperGameThreadMessage = ThreadCommunication<HelperGameThreadCodes>

export type ThreadExecutor = (data: Float64Array) => void

const enum x {
    hello = 1,
    rand = 12
}

const xMap = {
    1: "hello",
    12: "rand"
} as const

type xKey = keyof typeof xMap
