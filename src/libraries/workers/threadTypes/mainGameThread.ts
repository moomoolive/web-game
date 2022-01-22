// the "worker:" module alias is resolved
// by the vite-plugin-worker
// typescript definitions for these modules made possible by tsconfig.json
// module alias section
import mainGameThreadConstructor from "worker:@/libraries/workers/workerTypes/mainGameThread"
import { renderingThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { 
    MainThreadEventHandler, 
    MainThreadEventMessage, 
    RenderingThreadMessage 
} from "@/libraries/workers/types"
import { EngineOptions } from "@/libraries/gameEngine/types"

const logger = {
    log(...args: any[]) {
        console.log(renderingThreadIdentity(), ...args)
    },
    warn(...args: any[]) {
        console.warn(renderingThreadIdentity(), ...args)
    },
    error(...args: any[]) {
        console.error(renderingThreadIdentity(), ...args)
    },
} as const

let threadIdCounter = 0
export class MainGameThread {
    private worker = mainGameThreadConstructor()

    constructor() {
        this.worker.onerror = (err: ErrorEvent) => {
            logger.error(" fatal error occurred on main thread, error:", err)
        }

        this.worker.onmessageerror = message => {
            logger.error("error occur when recieving message from main thread, message:", message)
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

    setOnMessageHandler(handler: (message: MessageEvent<RenderingThreadMessage>) => void) {
        this.worker.onmessage = handler 
    }

    private postMessage(handler: MainThreadEventHandler, payload: Float64Array, meta: string[]) {
        let id = threadIdCounter
        threadIdCounter++
        const message: MainThreadEventMessage = { 
            handler,
            id,
            payload,
            meta
        }
        // pass payload by reference
        this.worker.postMessage(message, [payload.buffer])
    }

    notifyKeyDown(event: KeyboardEvent) {
        this.postMessage("keyDown", new Float64Array([event.keyCode]), [])
    }

    notifyKeyUp(event: KeyboardEvent) {
        this.postMessage("keyUp", new Float64Array([event.keyCode]), [])
    }

    renderingPingAcknowledged(pingStreamId: number, options: EngineOptions) {
        this.postMessage(
            "renderingPingAcknowledged", 
            new Float64Array(), 
            [JSON.stringify(options), "respondingTo="+ pingStreamId]
        )
    }

    prepareForRestart(fatalErrorMessageId: number) {
        this.postMessage(
            "prepareForRestart", 
            new Float64Array(), 
            ["respondingTo=" + fatalErrorMessageId]
        )
    }
}
