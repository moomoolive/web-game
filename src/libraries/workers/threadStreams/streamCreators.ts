import { MainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { HelperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { RenderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { 
    NO_RESPONSE_ID,
    PAYLOAD_START_INDEX,
    THREAD_STREAM_HANDLER_INDEX,
    THREAD_STREAM_META_DATA_PAYLOAD_DIVIDER_INDEX,
    THREAD_STREAM_ID_INDEX,
    THREAD_STREAM_RESPONSE_ID_INDEX,
    META_DATA_PAYLOAD_DIVIDER 
} from "./consts"

type Codes = MainThreadCodes |
    HelperGameThreadCodes |
    RenderingThreadCodes

type ThreadStreamFull<C=Codes> = (handler: C, streamId: number, responseId: number) => Float64Array
const threadStreamFull: ThreadStreamFull = (handler, streamId, responseId) => {
    return new Float64Array([handler as unknown as number, streamId, responseId, META_DATA_PAYLOAD_DIVIDER])
}

type ThreadStream<C=Codes> = (handler: C, streamId: number) => Float64Array
const threadStream: ThreadStream = (handler, streamId) => {
    return threadStreamFull(handler, streamId, NO_RESPONSE_ID)
}

type ThreadStreamFullWithPayload<C=Codes> = (handler: C, streamId: number, responseId: number, payload: Float64Array) => Float64Array
// payloads are always copied, and not sent by reference
const threadStreamFullWithPayload: ThreadStreamFullWithPayload = (
        handler,
        streamId,
        responseId,
        payload
    ) => {
        const stream = new Float64Array(PAYLOAD_START_INDEX + payload.length)
        stream[THREAD_STREAM_HANDLER_INDEX] = handler as unknown as number
        stream[THREAD_STREAM_ID_INDEX] = streamId
        stream[THREAD_STREAM_RESPONSE_ID_INDEX] = responseId
        stream[THREAD_STREAM_META_DATA_PAYLOAD_DIVIDER_INDEX] = META_DATA_PAYLOAD_DIVIDER
        stream.set(payload, PAYLOAD_START_INDEX)
        return stream
}

type ThreadStreamWithPayload<C=Codes> = (handler: C, streamId: number, payload: Float64Array) => Float64Array
const threadStreamWithPayload: ThreadStreamWithPayload = (
        handler,
        streamId,
        payload
    ) => {
        return threadStreamFullWithPayload(handler, streamId, NO_RESPONSE_ID, payload)
}

export const mainThreadStream: ThreadStream<MainThreadCodes> = threadStream
export const mainThreadStreamFull: ThreadStreamFull<MainThreadCodes> = threadStreamFull
export const mainThreadStreamWithPayload: ThreadStreamWithPayload<MainThreadCodes> = threadStreamWithPayload
export const mainThreadStreamFullWithPayload: ThreadStreamFullWithPayload<MainThreadCodes> = threadStreamFullWithPayload

export const renderingThreadStream: ThreadStream<RenderingThreadCodes> = threadStream
export const renderingThreadStreamFull: ThreadStreamFull<RenderingThreadCodes> = threadStreamFull
export const renderingThreadStreamWithPayload: ThreadStreamWithPayload<RenderingThreadCodes> = threadStreamWithPayload
export const renderingThreadStreamFullWithPayload: ThreadStreamFullWithPayload<RenderingThreadCodes> = threadStreamFullWithPayload

export const helperGameThreadStream: ThreadStream<HelperGameThreadCodes> = threadStream
export const helperGameThreadStreamFull: ThreadStreamFull<HelperGameThreadCodes> = threadStreamFull
export const helperGameThreadStreamWithPayload: ThreadStreamWithPayload<HelperGameThreadCodes> = threadStreamWithPayload
export const helperGameThreadStreamFullWithPayload: ThreadStreamFullWithPayload<HelperGameThreadCodes> = threadStreamFullWithPayload
