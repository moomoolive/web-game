import { WorkerPayload } from "./types"

self.onmessage = (message: MessageEvent<WorkerPayload>) => {
    console.log("msg @ worker3:", message.data)
    const msg: WorkerPayload = "hello friend" 
    self.postMessage(msg)
}
