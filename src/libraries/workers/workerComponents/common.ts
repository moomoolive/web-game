/* 
    this library assumes global worker context & not window context.
    most functions here will probably not work on the DOM thread!  
*/
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
