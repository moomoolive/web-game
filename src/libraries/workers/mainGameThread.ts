import { MainThreadMessage as Data, ThreadExecutor } from "./types"
import { mainThreadCodes } from "./messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"

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
        console.log("ping recieved on main thread @", unixTimestamp)
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
    }
}

self.onmessage = (message: MessageEvent<Data>) => {
    const { code, payload } = message.data
    FUNCTION_LOOKUP[code](payload)
}
