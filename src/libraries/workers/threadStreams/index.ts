import { MainThreadCodes, mainThreadCodesReverseMap } from "@/libraries/workers/messageCodes/mainThread"
import { HelperGameThreadCodes, helperGameThreadReverseMap } from "@/libraries/workers/messageCodes/helperGameThread"
import { RenderingThreadCodes, renderingThreadReverseMap } from "@/libraries/workers/messageCodes/renderingThread"

type AllPossibleReverseMaps = typeof renderingThreadReverseMap |
    typeof mainThreadCodesReverseMap |
    typeof helperGameThreadReverseMap

function mapCodeToName<M=AllPossibleReverseMaps>(codesReverseMap: M) {
    return function (codeToMap: keyof typeof codesReverseMap): string {
        return codesReverseMap[codeToMap] as unknown as string
    }
}

export const mainThreadCodeMap = mapCodeToName(mainThreadCodesReverseMap)
export const helperGameThreadCodeMap = mapCodeToName(helperGameThreadReverseMap)
export const renderingThreadCodeMap = mapCodeToName(renderingThreadReverseMap)


/*
passing messages between threads holds this convention:
[
  the_handler_to_be_called, 
  an_id_for_current_stream, 
  an_id_denoting_a_response_to_anothers_stream,
  padding (always zero),
  ...payload
]
message passing is done only throught Float64Arrays
*/
const META_DATA_PAYLOAD_DIVIDER = 0
const PAYLOAD_START_INDEX = 4
const NO_RESPONSE_ID = -1

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

const THREAD_STREAM_HANDLER_INDEX = 0
const THREAD_STREAM_ID_INDEX = 1
const THREAD_STREAM_RESPONSE_ID_INDEX = 2
const THREAD_STREAM_META_DATA_PAYLOAD_DIVIDER_INDEX = 3

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

// stream operators

export function getThreadStreamHandler(threadStream: Float64Array): number {
    return threadStream[THREAD_STREAM_HANDLER_INDEX]
}

export function setThreadStreamId(threadStream: Float64Array, newId: number) {
    threadStream[THREAD_STREAM_ID_INDEX] = newId
}

export function getThreadStreamId(threadStream: Float64Array): number {
    return threadStream[THREAD_STREAM_ID_INDEX]
}

export function setThreadResponseId(threadStream: Float64Array, newId: number) {
    threadStream[THREAD_STREAM_RESPONSE_ID_INDEX] = newId
}

export function setThreadHandler(threadSteam: Float64Array, newHandler: number) {
    threadSteam[THREAD_STREAM_HANDLER_INDEX] = newHandler
}

export function threadSteamPayloadFirst(threadStream: Float64Array): number {
    return threadStream[PAYLOAD_START_INDEX]
} 

export function mapThreadStream(threadStream: Float64Array, handler: (input: number) => number): Float64Array {
    if (!threadStream[PAYLOAD_START_INDEX]) {
        throw new Error("THREAD_STREAM_PROCESS_ERROR: payload does not exist")
    }
    for (let i = PAYLOAD_START_INDEX; i < threadStream.length; i++) {
        threadStream[i] = handler(threadStream[i])
    }
    return threadStream
}
