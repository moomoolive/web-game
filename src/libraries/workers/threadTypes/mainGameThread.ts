// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import mainGameThreadConstructor from "worker:@/libraries/workers/workerTypes/mainGameThread"
import { mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { 
    mainThreadStreamFull,
    mainThreadStreamWithPayload,
    mainThreadStreamFullWithPayload
} from "@/libraries/workers/threadStreams/streamCreators"
import { renderingThreadLogger } from "@/libraries/workers/devTools/logging"

const logger = renderingThreadLogger

let threadIdCounter = 0
function generateThreadId(): number {
    let id = threadIdCounter
    threadIdCounter++
    return id
}

export class MainGameThread {
    private worker = mainGameThreadConstructor()

    constructor() {
        this.worker.onerror = (err: ErrorEvent) => {
            logger.error(" fatal error occurred on main thread, error:", err)
        }

        this.worker.onmessageerror = err => {
            logger.error("error occur when recieving message from main thread, error:", err)
        }
    }

    terminate() {
        this.worker.terminate()
    }

    restart() {
        logger.log("⚡restarting main thread...")
        const previousOnMessage = this.worker.onmessage
        const previousOnError = this.worker.onerror
        const previousOnMessageError = this.worker.onmessageerror
        this.worker.terminate()
        this.worker = mainGameThreadConstructor()
        this.worker.onmessage = previousOnMessage
        this.worker.onerror = previousOnError
        this.worker.onmessageerror = previousOnMessageError 
    }

    setFatalErrorHandler(handler: (err: ErrorEvent) => void) {
        this.worker.onerror = handler
    }

    setOnMessageHandler(handler: (message: MessageEvent<Float64Array>) => void) {
        this.worker.onmessage = handler 
    }

    private postMessage(threadStream: Float64Array) {
        // pass payload by reference
        this.worker.postMessage(threadStream, [threadStream.buffer])
    }

    notifyKeyDown(event: KeyboardEvent) {
        const stream = mainThreadStreamWithPayload(
            mainThreadCodes.keyDown,
            generateThreadId(),
            new Float64Array([event.keyCode])
        )
        this.postMessage(stream)
    }

    notifyKeyUp(event: KeyboardEvent) {
        const stream = mainThreadStreamWithPayload(
            mainThreadCodes.keyUp,
            generateThreadId(),
            new Float64Array([event.keyCode])
        )
        this.postMessage(stream)
    }

    renderingPingAcknowledged(pingStreamId: number, gameOptionsStream: Float64Array) {
        const stream = mainThreadStreamFullWithPayload(
            mainThreadCodes.renderingPingAcknowledged,
            generateThreadId(),
            pingStreamId,
            gameOptionsStream
        )
        this.postMessage(stream)
    }

    prepareForRestart(fatalErrorNoticeStreamId: number) {
        const stream = mainThreadStreamFull(
            mainThreadCodes.prepareForRestart,
            generateThreadId(),
            fatalErrorNoticeStreamId
        )
        this.postMessage(stream)
    }
}
