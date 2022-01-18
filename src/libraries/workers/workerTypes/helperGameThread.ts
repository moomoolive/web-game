import { helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { ThreadExecutor, HelperGameThreadMessage as Data } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"

function sendToMainThread(code: mainThreadCodes, payload: Float64Array) {
    const message = { code, payload }
    self.postMessage(message, [payload.buffer])
}

function acknowledgeWorkerPing(payload: Float64Array) {
    sendToMainThread(mainThreadCodes.ACKNOWLEDGE_HELPER_PING, payload)
}

type HelperGameThreadFunctionLookup = {
    [key in helperGameThreadCodes]: ThreadExecutor
}

const FUNCTION_LOOKUP: Readonly<HelperGameThreadFunctionLookup> = {
    [helperGameThreadCodes.PING]: function (data: Float64Array) {
        const [workerId] = data
        console.log("worker", workerId, "recieved ping @", Date.now())
        acknowledgeWorkerPing(data)
        return data
    }
}

self.onmessage = (message: MessageEvent<Data>) => {
    const { code, payload } = message.data
    FUNCTION_LOOKUP[code](payload)
}
