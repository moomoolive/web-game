import { MainThreadMessage as Data, ThreadExecutor, RenderingThreadMessage } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { HelperGameThread } from "@/libraries/workers/workerTypes/index"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { emptyPayload } from "@/libraries/workers/common/index"

type MainThreadFunctionLookup = {
    [key in mainThreadCodes]: ThreadExecutor
}

function sendToRenderingThread(handler: renderingThreadCodes, payload: Float64Array) {
    const message: RenderingThreadMessage = { handler, payload }
    self.postMessage(message, [payload.buffer])
}

const FUNCTION_LOOKUP: Readonly<MainThreadFunctionLookup> = {
    keyDown(data: Float64Array) {
        sendToRenderingThread("keyDownResponse", data)
    },
    keyUp(data: Float64Array) {
        sendToRenderingThread("keyUpResponse", data)
    },
    helperPingAcknowledged(data: Float64Array) {
        const [workerId] = data
        console.log(mainThreadIdentity(), "game helper thread", workerId, "responded to ping")
    },
    renderingPingAcknowledged(_) {
        console.log(`${mainThreadIdentity()} rendering thread responded to ping`)
    }
}

function handleMessage(message: MessageEvent<Data>) {
    try {
        const { handler, payload } = message.data
        FUNCTION_LOOKUP[handler](payload)
    } catch(err) {
        console.warn(`${mainThreadIdentity()} something went wrong when looking up function, payload`, message.data)
        console.error("error:", err)
    }
}


sendToRenderingThread("acknowledgePing", emptyPayload())
const workers = []
const pingPromises = []
for (let i = 0; i < 2; i++) {
    workers.push(new HelperGameThread(i))
    const worker = workers[i]
    worker.setOnMessageHandler(handleMessage) 
    worker.setFatalErrorHandler(err => {
        console.error(mainThreadIdentity(), "fatal error occurred on worker", worker.id, ", err:", err)
    })
    pingPromises.push(worker.pingAsync())
}
await Promise.all(pingPromises)

self.onmessage = handleMessage

self.onerror = err => {
    console.error(`${mainThreadIdentity()} fatal error encountered, error:`, err)
}

self.onmessageerror = message => {
    console.error(`${mainThreadIdentity()} error occurred when recieving message from either rendering or helper threads, message:`, message)
}
