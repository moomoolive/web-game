import mainGameThreadConstructor from "worker:@/libraries/workers/workerTypes/mainGameThread"
import { mainThreadCodes } from "./messageCodes/mainThread"
import { renderingThreadCodes } from "./messageCodes/renderingThread"
import { helperGameThreadCodes } from "./messageCodes/helperGameThread"

export type WebWorkerConstructor = typeof mainGameThreadConstructor

interface ThreadCommunication<TARGET_THREAD_CODES> {
    handler: TARGET_THREAD_CODES,
    payload: Float64Array
}

export type MainThreadMessage = ThreadCommunication<mainThreadCodes>
export type RenderingThreadMessage = ThreadCommunication<renderingThreadCodes>
export type HelperGameThreadMessage = ThreadCommunication<helperGameThreadCodes>

export type ThreadExecutor = (data: Float64Array) => void
