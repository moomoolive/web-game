import mainGameThreadConstructor from "worker:@/libraries/workers/mainGameThread"
import { MAIN_THREAD_CODES } from "./messageCodes/mainThread"
import { RENDERING_THREAD_CODES } from "./messageCodes/renderingThread"

export type WebWorkerConstructor = typeof mainGameThreadConstructor

interface ThreadCommunication<TARGET_THREAD_CODES> {
    code: TARGET_THREAD_CODES,
    payload: Float64Array
}

export type MainThreadMessage = ThreadCommunication<MAIN_THREAD_CODES>
export type RenderingThreadMessage = ThreadCommunication<RENDERING_THREAD_CODES>

export type ThreadExecutor = (data: Float64Array) => Float64Array
