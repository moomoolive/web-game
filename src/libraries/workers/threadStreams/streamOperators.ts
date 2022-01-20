import { 
    THREAD_STREAM_RESPONSE_ID_INDEX,
    THREAD_STREAM_ID_INDEX,
    THREAD_STREAM_HANDLER_INDEX,
    PAYLOAD_START_INDEX,
} from "./consts"

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