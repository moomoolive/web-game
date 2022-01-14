import createWorker from "worker:@/libraries/workers/main"
import { WorkerPayload } from "./types"

export class WebWorker {
    #worker: Worker
    
    constructor() {
        const worker = createWorker() as unknown as Worker
        this.#worker = worker
    }

    postMessage(message: WorkerPayload) {
        this.#worker.postMessage(message)
    }

    set onmessage(handler: (message: MessageEvent<WorkerPayload>) => void) {
        this.#worker.onmessage = handler
    }

    terminate() {
        this.#worker.terminate()
    }
}
