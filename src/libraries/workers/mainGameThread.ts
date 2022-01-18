import { MainThreadMessage as Data, ThreadExecutor } from "./types"
import { MAIN_THREAD_CODES } from "./messageCodes/mainThread"
import { RENDERING_THREAD_CODES } from "@/libraries/workers/messageCodes/renderingThread"

type MainThreadFunctionLookup = {
    [key in MAIN_THREAD_CODES]: ThreadExecutor
}

const FUNCTION_LOOKUP: Readonly<MainThreadFunctionLookup> = {
    [MAIN_THREAD_CODES.HELLO]: function (data: Float64Array) {
        console.log("hello recieved on main thread @", new Date())
        sendToRenderingThread(RENDERING_THREAD_CODES.RETURN_HELLO, new Float64Array(2).fill(5))
        return data
    },
    [MAIN_THREAD_CODES.UNKNOWN]: function(data: Float64Array) {
        return data
    },
}

function sendToRenderingThread(code: RENDERING_THREAD_CODES, payload: Float64Array) {
    const message = { code, payload }
    self.postMessage(message, [payload.buffer])
}

self.onmessage = (message: MessageEvent<Data>) => {
    const { code, payload } = message.data
    FUNCTION_LOOKUP[code](payload)
}
