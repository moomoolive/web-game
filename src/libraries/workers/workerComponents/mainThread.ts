import { sendToRenderingThread } from "./common"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"

export function sendToRenderingThreadAsync(threadStream: Float64Array): Promise<void> {
    return new Promise((resolve, reject) => {
        const previousOnMessage = self.onmessage as (m: MessageEvent<Float64Array>) => void
        const previousOnMessageError = self.onmessageerror
        
        self.onmessage = (message: MessageEvent<Float64Array>) => {
            self.onmessage = previousOnMessage as (m: MessageEvent<Float64Array>) => void
            self.onmessageerror = previousOnMessageError
            self.onmessage(message)
            resolve()
        }

        self.onmessageerror = (message: MessageEvent<Float64Array>) => {
            self.onmessage = previousOnMessage as (m: MessageEvent<Float64Array>) => void
            self.onmessageerror = previousOnMessageError
            console.error(
                mainThreadIdentity(),
                "an error occurred when receiving a message from rendering thread",
                ", message:",
                message
            )
            reject()
        }
    
        sendToRenderingThread(threadStream)
    })
}