import { 
    getThreadStreamId,
    getThreadStreamHandler,
    getThreadResponseId,
    duplicateThreadStreamPayload
} from "@/libraries/workers/threadStreams/streamOperators"
import { helperGameThreadCodesReverseMap, HelperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { mainThreadCodesReverseMap, MainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodesReverseMap, RenderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { NO_RESPONSE_ID } from "./consts"

interface StreamDebugData {
    streamId: number
    handler: string
    rawHandler: number
    responseId: number
    payload: Float64Array
    rawStream: Float64Array
    isRespondingToAnotherStream: boolean,
    source: StreamSources
}

type ThreadCode = MainThreadCodes |
    HelperGameThreadCodes |
    RenderingThreadCodes 

function mapHandlerToName(rawHandler: ThreadCode): string {
    let handlerName = "handler does not exist"
    if (helperGameThreadCodesReverseMap[rawHandler as HelperGameThreadCodes]) {
        return helperGameThreadCodesReverseMap[rawHandler as HelperGameThreadCodes]
    } else if (mainThreadCodesReverseMap[rawHandler as MainThreadCodes]) {
        return mainThreadCodesReverseMap[rawHandler as MainThreadCodes]
    } else if (renderingThreadCodesReverseMap[rawHandler as RenderingThreadCodes]) {
        return renderingThreadCodesReverseMap[rawHandler as RenderingThreadCodes]
    }
    return handlerName
}

type StreamSources = "main-thread" | "rendering-thread" | "helper-thread"

export function streamDebugInfo(threadStream: Float64Array, source: StreamSources): StreamDebugData {
    const streamId = getThreadStreamId(threadStream)
    const responseId = getThreadResponseId(threadStream)
    const rawHandler = getThreadStreamHandler(threadStream)
    const payload = duplicateThreadStreamPayload(threadStream)
    return {
        streamId,
        responseId,
        rawHandler,
        handler: mapHandlerToName(rawHandler as ThreadCode),
        payload,
        rawStream: threadStream,
        isRespondingToAnotherStream: responseId !== NO_RESPONSE_ID,
        source
    }
}
