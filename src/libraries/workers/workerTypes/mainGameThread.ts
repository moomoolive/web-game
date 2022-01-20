import { ThreadExecutor } from "@/libraries/workers/types"
import { MainThreadCodes, mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { 
    getThreadStreamHandler,
    setThreadStreamId,
    getThreadStreamId,
    setThreadResponseId,
    setThreadHandler,
} from "@/libraries/workers/threadStreams/streamOperators"
import { renderingThreadStream } from "@/libraries/workers/threadStreams/streamCreators"
import { HelperGameThreadPool } from "@/libraries/workers/threadTypes/helperGameThreadPool"

type MainThreadFunctionLookup = {
    [key in MainThreadCodes]: ThreadExecutor
}

function sendToRenderingThread(threadStream: Float64Array) {
    self.postMessage(threadStream, [threadStream.buffer])
}

let threadIdCounter = 0

function generateStreamId(): number {
    const id = threadIdCounter
    threadIdCounter++
    return id
}

const HANDLER_LOOKUP: Readonly<MainThreadFunctionLookup> = {
    [mainThreadCodes.keyDown](stream: Float64Array) {
        const previousStreamId = getThreadStreamId(stream)
        setThreadStreamId(stream, generateStreamId())
        setThreadResponseId(stream, previousStreamId)
        setThreadHandler(stream, renderingThreadCodes.keyDownResponse)
        sendToRenderingThread(stream)
    },
    [mainThreadCodes.keyUp](stream: Float64Array) {
        const previousStreamId = getThreadStreamId(stream)
        setThreadStreamId(stream, generateStreamId())
        setThreadResponseId(stream, previousStreamId)
        setThreadHandler(stream, renderingThreadCodes.keyUpResponse)
        sendToRenderingThread(stream)
    },
    [mainThreadCodes.helperPingAcknowledged](data: Float64Array) {
        const [workerId] = data
        console.log(mainThreadIdentity(), "game helper thread", workerId, "responded to ping")
    },
    [mainThreadCodes.renderingPingAcknowledged](_) {
        console.log(`${mainThreadIdentity()} rendering thread responded to ping`)
    }
}

self.onmessage = function handleRenderingThreadMessage(message: MessageEvent<Float64Array>) {
    try {
        const stream = message.data
        const handler = getThreadStreamHandler(stream) as MainThreadCodes
        HANDLER_LOOKUP[handler](stream)
    } catch(err) {
        console.warn(`${mainThreadIdentity()} something went wrong when looking up function, payload`, message.data)
        console.error("error:", err)
    }
}

self.onerror = function handleMainThreadError(err) {
    console.error(mainThreadIdentity(), "fatal error encountered, error:", err)
}

self.onmessageerror = message => {
    console.error(
        mainThreadIdentity(), 
        "error occurred when recieving message from either rendering or helper threads, message:",
        message
    )
}

sendToRenderingThread(
    renderingThreadStream(
        renderingThreadCodes.acknowledgePing,
        generateStreamId()
    ),
    
)

const threadPool = new HelperGameThreadPool({ threadCount: 2 })
await threadPool.initialize()
await threadPool.spawnJob(helperGameThreadCodes.acknowledgePing, new Float64Array([1]), (data) => {
    console.log("hello from data closure", data)
})

