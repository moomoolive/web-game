/* 
    this library assumes global worker context & not window context.
    most functions here will probably not work on the DOM thread!  
*/
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { streamDebugInfo, StreamSources } from "@/libraries/workers/threadStreams/debugTools"

export function workerErrorHandler(workerIdentityString: () => string) {
    return (err: string | Event) => {
        console.error(
            workerIdentityString(),
            "fatal error occurred, error:",
            err
        )
    }
}

export function workerMessageErrorHandler(workerIdentityString: () => string, recievesFrom: StreamSources) {
    return (message: MessageEvent<Float64Array>) => {
        console.error(
            workerIdentityString(),
            "error occurred when recieving message from",
            recievesFrom,
        )
        console.error("stream debug:", streamDebugInfo(message.data, recievesFrom))
    }
}

export const mainThreadErrorHandler = workerErrorHandler(mainThreadIdentity)
export const mainThreadMessageErrorHandler = workerMessageErrorHandler(mainThreadIdentity, "rendering-thread")


function sendToParentThread(threadStream: Float64Array) {
    self.postMessage(threadStream, [threadStream.buffer])
}
// these two are more or less just aliases
export const sendToRenderingThread = sendToParentThread
export const sendToMainThread = sendToParentThread

let threadIdCounter = 0
export function generateStreamId(): number {
    const id = threadIdCounter
    threadIdCounter++
    return id
}
