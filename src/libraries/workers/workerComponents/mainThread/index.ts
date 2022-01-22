/* 
    this library assumes global worker context & not window context.
    most functions here will probably not work on the DOM thread!  
*/
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { RenderingThreadHandler, RenderingThreadMessage, MainThreadEventMessage } from "@/libraries/workers/types"
import { sleepSeconds } from "@/libraries/misc"

let messageIdCount = 0

export function sendToRenderingThread(handler: RenderingThreadHandler, payload: Float64Array, meta: string[]) {
    const id = messageIdCount
    messageIdCount++
    const message: RenderingThreadMessage = {
        handler,
        payload,
        meta,
        id
    }
    self.postMessage(message, [payload.buffer])
}

export function sendToRenderingThreadAsync(handler: RenderingThreadHandler, payload: Float64Array, meta: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const previousOnMessage = self.onmessage as (m: MessageEvent<MainThreadEventMessage>) => void
        const previousOnMessageError = self.onmessageerror
        
        self.onmessage = (message: MessageEvent<MainThreadEventMessage>) => {
            self.onmessage = previousOnMessage as (m: MessageEvent<MainThreadEventMessage>) => void
            self.onmessageerror = previousOnMessageError
            self.onmessage(message)
            resolve()
        }

        self.onmessageerror = (message: MessageEvent<MainThreadEventMessage>) => {
            self.onmessage = previousOnMessage as (m: MessageEvent<MainThreadEventMessage>) => void
            self.onmessageerror = previousOnMessageError
            console.error(
                mainThreadIdentity(),
                "an error occurred when receiving a message from rendering thread",
                ", message:",
                message
            )
            reject()
        }

        sendToRenderingThread(handler, payload, meta)
    })
}

export async function yieldForIncomingEvents(): Promise<void> {
    await sleepSeconds(0)
}
