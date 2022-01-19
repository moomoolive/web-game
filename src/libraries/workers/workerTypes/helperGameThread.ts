import { helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { ThreadExecutor, HelperGameThreadMessage as Data } from "@/libraries/workers/types"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { MainThreadMessage } from "@/libraries/workers/types"
import { helperGameThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"

function sendToMainThread(handler: mainThreadCodes, payload: Float64Array) {
    const message: MainThreadMessage = { handler, payload }
    self.postMessage(message, [payload.buffer])
}

const ID_NOT_DEFINED = -1

// named with snake case because "workedId" variable name
// is used in the lookup functions sometimes
let worker_id = ID_NOT_DEFINED

function debugIdentity(): string {
    const workerTag = worker_id === ID_NOT_DEFINED ? "(id not defined)" : worker_id.toString()
    return helperGameThreadIdentity(workerTag)
}

type HelperGameThreadFunctionLookup = {
    [key in helperGameThreadCodes]: ThreadExecutor
}

const HANDLER_LOOKUP: Readonly<HelperGameThreadFunctionLookup> = {
    acknowledgePing(data: Float64Array) {
        const [workerId] = data
        worker_id = workerId
        console.log(`${debugIdentity()} ping acknowledged @`, Date.now())
        sendToMainThread("helperPingAcknowledged", data)
    }
}

self.onmessage = (message: MessageEvent<Data>) => {
    try {
        const { handler, payload } = message.data
        HANDLER_LOOKUP[handler](payload)
    } catch(err) {
        console.warn(`${debugIdentity()} something went wrong when looking up function, payload`, message.data)
        console.error("error:", err)
    }
}

self.onerror = err => {
    console.error(`${debugIdentity()} fatal error encountered, error:`, err)
}

self.onmessageerror = (message: MessageEvent<Data>) => {
    console.error(`${debugIdentity()} error occurred when recieving message from main thread, message:`, message)
}
