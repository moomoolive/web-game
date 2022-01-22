import { helperGameThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { HelperGameThreadHandlerLookup, HelperGameThreadMessage } from "@/libraries/workers/types"
import { sendToMainThread } from "@/libraries/workers/workerComponents/helperGameThread/index"

const ID_NOT_DEFINED = -1

// named with snake case because "workedId" variable name
// is used in the lookup functions sometimes
let worker_id = ID_NOT_DEFINED

function debugIdentity(): string {
    const workerTag = worker_id === ID_NOT_DEFINED ? "(id not defined)" : worker_id.toString()
    return helperGameThreadIdentity(workerTag)
}

const logger = {
    log(...args: any[]) {
        console.log(debugIdentity(), ...args)
    },
    warn(...args: any[]) {
        console.warn(debugIdentity(), ...args)
    },
    error(...args: any[]) {
        console.error(debugIdentity(), ...args)
    },
} as const

self.onerror = err => logger.error("a fatal error occured, error:", err)
self.onmessage = message => {
    logger.warn("an error occurred when recieving a message from rendering thread")
    logger.error("message:", message.data)
}

const HANDLER_LOOKUP: Readonly<HelperGameThreadHandlerLookup> = {
    acknowledgePing(payload: Float64Array, _: string[], id: number) {
        const [workerId] = payload
        worker_id = workerId ?? ID_NOT_DEFINED
        logger.log(`ping acknowledged @`, Date.now())
        sendToMainThread(
            "helperPingAcknowledged",
            new Float64Array(),
            ["respondingTo=" + id]
        )
    }
}

self.onmessage = (message: MessageEvent<HelperGameThreadMessage>) => {
    const data = message.data
    try {
        const { handler, payload, id, meta } = data
        HANDLER_LOOKUP[handler](payload, meta, id) 
    } catch(err) {
        logger.warn(`something went wrong when looking up function`)
        logger.warn("message :", data)
        /* send back to main thread to deal with error */
        logger.error(err)
        sendToMainThread(
            "jobCouldNotComplete", 
            message.data.payload,
            ["incompleteJobId=" + message.data.id] 
        )
    }
}
