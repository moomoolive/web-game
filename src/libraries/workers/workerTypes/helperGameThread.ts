import { HelperGameThreadCodes, helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { ThreadExecutor } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { helperGameThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { 
    getThreadStreamHandler,
    threadSteamPayloadFirst,
    samePayloadResponseThreadStream
} from "@/libraries/workers/threadStreams/streamOperators"
import { streamDebugInfo } from "@/libraries/workers/threadStreams/debugTools"
import {
    sendToMainThread,
    generateStreamId,
    workerErrorHandler,
    workerMessageErrorHandler
} from "@/libraries/workers/workerComponents/common"

const ID_NOT_DEFINED = -1

// named with snake case because "workedId" variable name
// is used in the lookup functions sometimes
let worker_id = ID_NOT_DEFINED

function debugIdentity(): string {
    const workerTag = worker_id === ID_NOT_DEFINED ? "(id not defined)" : worker_id.toString()
    return helperGameThreadIdentity(workerTag)
}

self.onerror = workerErrorHandler(debugIdentity)
self.onmessage = workerMessageErrorHandler(debugIdentity, "main-thread")

type HelperGameThreadFunctionLookup = {
    [key in HelperGameThreadCodes]: ThreadExecutor
}

const HANDLER_LOOKUP: Readonly<HelperGameThreadFunctionLookup> = {
    [helperGameThreadCodes.acknowledgePing](stream: Float64Array) {
        const workerId = threadSteamPayloadFirst(stream)
        worker_id = workerId ?? ID_NOT_DEFINED
        console.log(`${debugIdentity()} ping acknowledged @`, Date.now())
        samePayloadResponseThreadStream(
            mainThreadCodes.helperPingAcknowledged,
            generateStreamId(),
            stream
        )
        sendToMainThread(stream)
    }
}

self.onmessage = (message: MessageEvent<Float64Array>) => {
    const stream = message.data
    try {
        const handler = getThreadStreamHandler(stream) as HelperGameThreadCodes
        HANDLER_LOOKUP[handler](stream) 
    } catch(err) {
        console.warn(`${debugIdentity()} something went wrong when looking up function`)
        console.warn("stream debug:", streamDebugInfo(stream, "main-thread"))
        /* send back to main thread to deal with error */
        console.error(debugIdentity(), err)
        samePayloadResponseThreadStream(
            mainThreadCodes.jobCouldNotComplete,
            generateStreamId(),
            stream
        )
        sendToMainThread(stream)
    }
}
