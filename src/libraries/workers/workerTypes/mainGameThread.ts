import { MainThreadMessage as Data, ThreadExecutor } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { HelperGameThread } from "@/libraries/workers/workerTypes/index"

type MainThreadFunctionLookup = {
    [key in mainThreadCodes]: ThreadExecutor
}

function sendToRenderingThread(code: renderingThreadCodes, payload: Float64Array) {
    const message = { code, payload }
    self.postMessage(message, [payload.buffer])
}

function returnPing(unixTimestamp: number) {
    sendToRenderingThread(renderingThreadCodes.RETURN_PING, new Float64Array([unixTimestamp]))
}

const FUNCTION_LOOKUP: Readonly<MainThreadFunctionLookup> = {
    [mainThreadCodes.PING]: function (data: Float64Array) {
        const unixTimestamp = Date.now()
        console.log("main thread recieved ping @", unixTimestamp)
        returnPing(unixTimestamp)
        return data
    },
    [mainThreadCodes.KEY_DOWN]: function(data: Float64Array) {
        sendToRenderingThread(renderingThreadCodes.KEY_DOWN_RESPONSE, data)
        return data
    },
    [mainThreadCodes.KEY_UP]: function(data) {
        sendToRenderingThread(renderingThreadCodes.KEY_UP_RESPONSE, data)
        return data
    },
    [mainThreadCodes.ACKNOWLEDGE_HELPER_PING](data) {
        const [workerId] = data
        console.log("worker", workerId, "ping acknowledged")
        return data
    }
}

function handleMessage(message: MessageEvent<Data>) {
    const { code, payload } = message.data
    FUNCTION_LOOKUP[code](payload)
} 

const workers = []
for (let i = 0; i < 1; i++) {
    workers.push(new HelperGameThread(i))
    workers[i].onmessage = handleMessage
    workers[i].ping()
}

self.onmessage = handleMessage
