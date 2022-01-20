import { HelperGameThreadCodes, helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { ThreadExecutor } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { helperGameThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { 
    getThreadStreamHandler,
    threadSteamPayloadFirst,
    getThreadStreamId,
    setThreadStreamId,
    setThreadHandler,
    setThreadResponseId
} from "@/libraries/workers/threadStreams/streamOperators"

function sendToMainThread(stream: Float64Array) {
    self.postMessage(stream, [stream.buffer])
}

const ID_NOT_DEFINED = -1

// named with snake case because "workedId" variable name
// is used in the lookup functions sometimes
let worker_id = ID_NOT_DEFINED
let streamIdCounter = 0

function generateStreamId(): number {
    const id = streamIdCounter
    streamIdCounter++
    return id
}

function debugIdentity(): string {
    const workerTag = worker_id === ID_NOT_DEFINED ? "(id not defined)" : worker_id.toString()
    return helperGameThreadIdentity(workerTag)
}

type HelperGameThreadFunctionLookup = {
    [key in HelperGameThreadCodes]: ThreadExecutor
}

const HANDLER_LOOKUP: Readonly<HelperGameThreadFunctionLookup> = {
    [helperGameThreadCodes.acknowledgePing](stream: Float64Array) {
        const workerId = threadSteamPayloadFirst(stream)
        worker_id = workerId ?? ID_NOT_DEFINED
        console.log(`${debugIdentity()} ping acknowledged @`, Date.now())
        const previousStreamId = getThreadStreamId(stream)
        setThreadResponseId(stream, previousStreamId)
        setThreadStreamId(stream, generateStreamId())
        setThreadHandler(stream, mainThreadCodes.helperPingAcknowledged)
        sendToMainThread(stream)
    }
}

self.onmessage = (message: MessageEvent<Float64Array>) => {
    try {
        const stream = message.data
        const handler = getThreadStreamHandler(stream) as HelperGameThreadCodes
        HANDLER_LOOKUP[handler](stream) 
    } catch(err) {
        console.warn(`${debugIdentity()} something went wrong when looking up function, payload`, message.data)
        console.error("error:", err)
    }
}

self.onerror = err => {
    console.error(`${debugIdentity()} fatal error encountered, error:`, err)
}

self.onmessageerror = (message: MessageEvent<Float64Array>) => {
    console.error(`${debugIdentity()} error occurred when recieving message from main thread, message:`, message)
}
