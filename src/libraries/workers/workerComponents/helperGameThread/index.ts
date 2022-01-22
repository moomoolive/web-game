/* 
    this library assumes global worker context & not window context.
    most functions here will probably not work on the DOM thread!  
*/
import { MainThreadHelperHandler, MainThreadHelperMessage } from "@/libraries/workers/types"

let messageIdCount = 0

export function sendToMainThread(handler: MainThreadHelperHandler, payload: Float64Array, meta: string[]) {
    const id = messageIdCount
    messageIdCount++
    const message: MainThreadHelperMessage = {
        handler,
        payload,
        meta,
        id
    }
    self.postMessage(message, [payload.buffer])
}