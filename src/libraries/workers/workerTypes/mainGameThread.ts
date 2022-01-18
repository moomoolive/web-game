import { MainThreadMessage as Data, ThreadExecutor } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { HelperGameThread } from "@/libraries/workers/index"
//import { helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"

function sendToRenderingThread(code: renderingThreadCodes, payload: Float64Array) {
    const message = { code, payload }
    self.postMessage(message, [payload.buffer])
}

function returnPing(unixTimestamp: number) {
    sendToRenderingThread(renderingThreadCodes.RETURN_PING, new Float64Array([unixTimestamp]))
}

function keyDownResponse(data: Float64Array) {
    sendToRenderingThread(renderingThreadCodes.KEY_DOWN_RESPONSE, data)
}

function keyUpResponse(data: Float64Array) {
    sendToRenderingThread(renderingThreadCodes.KEY_UP_RESPONSE, data)
} 

type MainThreadFunctionLookup = {
    [key in mainThreadCodes]: ThreadExecutor
}

const FUNCTION_LOOKUP: Readonly<MainThreadFunctionLookup> = {
    [mainThreadCodes.PING]: function (data: Float64Array) {
        const unixTimestamp = Date.now()
        console.log("ping recieved on main thread @", unixTimestamp)
        returnPing(unixTimestamp)
        return data
    },
    [mainThreadCodes.KEY_DOWN]: function(data: Float64Array) {
        keyDownResponse(data)
        return data
    },
    [mainThreadCodes.KEY_UP]: function(data) {
        keyUpResponse(data)
        return data
    },
    [mainThreadCodes.ACKNOWLEDGE_HELPER_PING]: function(data) {
        const [workerId] = data
        console.log("worker", workerId, "ping acknowledged")
        return data
    }
}

function onMessage(message: MessageEvent<Data>) {
    const { code, payload } = message.data
    FUNCTION_LOOKUP[code](payload)
}

const workers = []
for (let i = 0; i < 2; i++) {
    workers.push(new HelperGameThread(i))
    const worker = workers[i]
    worker.onmessage = onMessage
    workers[i].ping()
}

self.onmessage = onMessage
