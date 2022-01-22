import { HelperGameThreadPool } from "@/libraries/workers/threadTypes/helperGameThreadPool"
import { AppDatabase } from "@/libraries/appDB/index"
import { Reference } from "@/libraries/dataStructures/index"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
import { 
    MainThreadEventHandlerLookup, 
    MainThreadEventMessage,
    CompiledGameState 
} from "@/libraries/workers/types"
import { 
    sendToRenderingThread, 
    sendToRenderingThreadAsync,
    yieldForIncomingEvents 
} from "@/libraries/workers/workerComponents/mainThread/index"
import { EngineOptions } from "@/libraries/gameEngine/types"

const logger = {
    log(...args: any[]) {
        console.log(mainThreadIdentity(), ...args)
    },
    warn(...args: any[]) {
        console.warn(mainThreadIdentity(), ...args)
    },
    error(...args: any[]) {
        console.error(mainThreadIdentity(), ...args)
    },
} as const

self.onerror = err => logger.error("a fatal error occured, error:", err)
self.onmessageerror = message => {
    logger.warn("an error occurred when recieving a message from main thread")
    logger.error("message:", message.data)
}

logger.log("thread is running")

let emergencyShutdown = new Reference(false)
let incomingEventsQueue: MainThreadEventMessage[] = []
const db = new AppDatabase()

const EVENT_HANDLER_LOOKUP: Readonly<MainThreadEventHandlerLookup> = {
    keyDown(payload: Float64Array, _: string[], id: number) {
        sendToRenderingThread(
            "keyDownResponse",
            payload,
            ["respondingTo=" + id]
        )
    },
    keyUp(payload: Float64Array, _: string[], id: number) {
        sendToRenderingThread(
            "keyUpResponse",
            payload,
            ["respondingTo="+ id]
        )
    },
    async renderingPingAcknowledged(_: Float64Array, meta: string[]) {
        logger.log("rendering thread responded to ping")
        const [stringifiedOptions] = meta
        const { loadFromCrash } = JSON.parse(stringifiedOptions) as EngineOptions
        if (!loadFromCrash) {
            return
        }
        logger.log("loading state from crash save")
        try {
            const _ = await db.getLatestCrashSave()
            /* idealy replace current state */
        } catch(err) {
            logger.error("loading from crash save failed, error", err)
        }
    },
    prepareForRestart() {
        logger.warn("rendering thread has requested restart, probably due to an unrecoverable error")
        logger.warn("⚡restarting immediately...")
        logger.log("preparing for backup")
        emergencyShutdown.set(true)
    }
}

self.onmessage = function handleRenderingThreadMessage(message: MessageEvent<MainThreadEventMessage>) {
    const incomingEvent = message.data
    try {
        incomingEventsQueue.push(incomingEvent)
    } catch(err) {
        logger.warn("couldn't add incoming event to event queue")
        logger.warn("event:", incomingEvent)
        logger.error("error:", err)
    }
}


async function handleIncomingEvents() {
    await yieldForIncomingEvents()

    for (let i = 0; i < incomingEventsQueue.length; i++) {
        const { id, payload, meta, handler } = incomingEventsQueue[i]
        try {
            EVENT_HANDLER_LOOKUP[handler](payload, meta, id)
        } catch(err) {
            logger.warn("something went wrong when looking up handler for incoming event")
            logger.warn("event:", incomingEventsQueue[i])
            logger.error("error", err)
        }
    }

    /* 
        all unsuccesful events are forgotten
        so that event queue doesn't clog 
    */
    incomingEventsQueue = []
}

function sendRenderingInfo() {}

const NO_TIMER_DEFINED = -1 
const MAX_GAME_LOOP_ERROR_RETRIES = 5
const RESET_LOOP_RETRY_COUNT_MILLISECONDS = 3_000

async function gameLoop() {
    let errorMessage = "no message"
    const threadPool = new HelperGameThreadPool({ threadCount: 2 })

    try {
        await Promise.all([
            sendToRenderingThreadAsync("acknowledgePing", new Float64Array(), []),
            threadPool.initialize()
        ])
    } catch(err) {
        errorMessage = (err as unknown as string)?.toString()
        /* loop until rendering thread sends help */
        while (!emergencyShutdown.value) {
            sendToRenderingThread(
                "respondToFatalError",
                new Float64Array(),
                ["gameInitalizationError", errorMessage]
            )
            logger.warn("waiting for rendering thread repsonse")
            await handleIncomingEvents()
        }
    }
    
    await handleIncomingEvents()

    let runGameLoop = true
    let loopRetryCount = 0
    let resetLoopRetryCountTimerId = NO_TIMER_DEFINED

    logger.log("🔥game loop ready")
    
    while(runGameLoop) {
        try {
            sendRenderingInfo()
            await handleIncomingEvents()
        } catch(err) {
            if (loopRetryCount === MAX_GAME_LOOP_ERROR_RETRIES) {
                logger.warn(
                    "loop has failed more than", 
                    MAX_GAME_LOOP_ERROR_RETRIES,
                    "times, this error is probably fatal.",
                    "Loop will retry once more then exit if error occurs again."
                )

                /* 
                    clear all incoming events that haven't been processed
                    as it may be source of error 
                */
                incomingEventsQueue = []
            } else if (loopRetryCount > MAX_GAME_LOOP_ERROR_RETRIES) {
                errorMessage = (err as unknown as string)?.toString()
                runGameLoop = false
            }
            logger.error("an uncaught exception occured in game loop. Restarting! Error:", err)
            loopRetryCount++
            clearTimeout(resetLoopRetryCountTimerId)
            setTimeout(() => loopRetryCount = 0, RESET_LOOP_RETRY_COUNT_MILLISECONDS)
        }
    }

    /* 
        wait for further instruction from rendering thread,
        CAUTION: this will loop forever if no response comes
        from rendering thread 
    */
    while (!emergencyShutdown.value) {
        sendToRenderingThread(
            "respondToFatalError",
            new Float64Array(),
            ["gameLoopError", errorMessage]
        )
        logger.warn("waiting for rendering thread repsonse")
        await handleIncomingEvents()
    }

    /*  
        should only occur on if response comes from rendering;
        * emergency backup
    */
    let saveMetaData = "backupCreated=true"
    try {
        const state: CompiledGameState = {}
        await db.createCrashSave(JSON.stringify(state))
        logger.log("backup successfully created")
    } catch(err) {
        /* 
            lol, at this point, the game has given up on try to save
            the current game state
        */
        logger.error("backup protocol failed, error:", err)
        saveMetaData = "backupCreated=false"
    } finally {
        sendToRenderingThread("readyForRestart", new Float64Array(), [saveMetaData])
    }
}

gameLoop()
