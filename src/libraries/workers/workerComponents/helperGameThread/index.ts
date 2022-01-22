/* 
    this library assumes global worker context & not window context.
    most functions here will probably not work on the DOM thread!  
*/
import { MainThreadHelperHandler, MainThreadHelperMessage } from "@/libraries/workers/types"
import { generateMessageId } from "@/libraries/workers/workerComponents/common"

export function sendToMainThread(handler: MainThreadHelperHandler, payload: Float64Array, meta: string[]) {
    const message: MainThreadHelperMessage = {
        handler,
        payload,
        meta,
        id: generateMessageId()
    }
    self.postMessage(message, [payload.buffer])
}