import { ThreadExecutor } from "@/libraries/workers/types"
import { MainThreadCodes, mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { helperGameThreadCodes } from "@/libraries/workers/messageCodes/helperGameThread"
import { 
    getThreadStreamHandler,
    setThreadStreamId,
    getThreadStreamId,
    setThreadResponseId,
    setThreadHandler,
} from "@/libraries/workers/threadStreams/streamOperators"
import { renderingThreadStream } from "@/libraries/workers/threadStreams/streamCreators"
import { HelperGameThreadPool } from "@/libraries/workers/threadTypes/helperGameThreadPool"
import { streamDebugInfo } from "@/libraries/workers/threadStreams/debugTools"
import { yieldForIncomingEvents } from "@/libraries/workers/utils/index"
import { 
    mainThreadErrorHandler, 
    mainThreadMessageErrorHandler,
    sendToRenderingThread,
    generateStreamId
} from "@/libraries/workers/workerComponents/common"
import { AppDatabase } from "@/libraries/appDB/index"
import { parseEngineOptions } from "@/libraries/gameEngine/inputOptions/index"
import { Reference } from "@/libraries/dataStructures/index"
import { sendToRenderingThreadAsync } from "@/libraries/workers/workerComponents/mainThread"
import { mainThreadLogger } from "@/libraries/workers/devTools/logging"

const logger = mainThreadLogger

logger.log("thread is running")

self.onerror = mainThreadErrorHandler
self.onmessageerror = mainThreadMessageErrorHandler

type MainThreadFunctionLookup = {
    [key in MainThreadCodes]: ThreadExecutor
}

let emergencyShutdown = new Reference(false)
let incomingEventsQueue: Float64Array[] = []
const db = new AppDatabase()

const HANDLER_LOOKUP: Readonly<MainThreadFunctionLookup> = {
    [mainThreadCodes.keyDown](stream: Float64Array) {
        const previousStreamId = getThreadStreamId(stream)
        setThreadStreamId(stream, generateStreamId())
        setThreadResponseId(stream, previousStreamId)
        setThreadHandler(stream, renderingThreadCodes.keyDownResponse)
        sendToRenderingThread(stream)
    },
    [mainThreadCodes.keyUp](stream: Float64Array) {
        const previousStreamId = getThreadStreamId(stream)
        setThreadStreamId(stream, generateStreamId())
        setThreadResponseId(stream, previousStreamId)
        setThreadHandler(stream, renderingThreadCodes.keyUpResponse)
        sendToRenderingThread(stream)
    },
    [mainThreadCodes.helperPingAcknowledged](data: Float64Array) {
        const [workerId] = data
        logger.log("game helper thread", workerId, "responded to ping")
    },
    async [mainThreadCodes.renderingPingAcknowledged](stream: Float64Array) {
        logger.log("rendering thread responded to ping")
        const { loadFromCrash } = parseEngineOptions(stream)
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
    [mainThreadCodes.jobCouldNotComplete](_) {},
    [mainThreadCodes.prepareForRestart](_) {
        logger.warn("rendering thread has requested restart, probably due to an unrecoverable error")
        logger.warn("⚡restarting immediately...")
        logger.log("preparing for backup")
        emergencyShutdown.set(true)
        /* clear all incoming events that haven't been processed */
        incomingEventsQueue = []
    }
}

self.onmessage = function handleRenderingThreadMessage(message: MessageEvent<Float64Array>) {
    const stream = message.data
    try {
        incomingEventsQueue.push(stream)
    } catch(err) {
        logger.warn("couldn't add incoming event to inputs")
        logger.warn(streamDebugInfo(stream, "rendering-thread"))
        logger.error("error:", err)
    }
}


async function handleIncomingEvents() {
    await yieldForIncomingEvents()

    for (let i = 0; i < incomingEventsQueue.length; i++) {
        const stream = incomingEventsQueue[i]
        try {
            const handler = getThreadStreamHandler(stream) as MainThreadCodes
            HANDLER_LOOKUP[handler](stream)
        } catch(err) {
            logger.warn("something went wrong when looking up handler for incoming event")
            logger.warn(streamDebugInfo(stream, "rendering-thread"))
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

interface GameState {}

const NO_TIMER_DEFINED = -1 
const MAX_GAME_LOOP_ERROR_RETRIES = 5
const RESET_LOOP_RETRY_COUNT_MILLISECONDS = 3_000

async function gameLoop() {
    let runGameLoop = true
    let loopRetryCount = 0
    let resetLoopRetryCountTimerId = NO_TIMER_DEFINED

    const threadPool = new HelperGameThreadPool({ threadCount: 2 })

    await Promise.all([
        sendToRenderingThreadAsync(
            renderingThreadStream(renderingThreadCodes.acknowledgePing, generateStreamId()),
        ),
        threadPool.initialize()
    ])
    
    logger.log("🔥game loop ready")
    
    while(runGameLoop) {
        try {
            sendRenderingInfo()
            await handleIncomingEvents()
        } catch(err) {
            if (loopRetryCount === MAX_GAME_LOOP_ERROR_RETRIES) {
                logger.warn(
                    "loop has fail more than", 
                    MAX_GAME_LOOP_ERROR_RETRIES,
                    ", this error is probably fatal.",
                    "Loop with retry once more then exit."
                )
                // notify rendering thread
                sendToRenderingThread(
                    renderingThreadStream(
                        renderingThreadCodes.respondToFatalError, 
                        generateStreamId()
                    ),
                )
            } else if (loopRetryCount > MAX_GAME_LOOP_ERROR_RETRIES) {
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
        logger.warn("waiting for rendering thread repsonse")
        await handleIncomingEvents()
    }

    /*  
        should only occur on if response comes from rendering;
        * emergency backup
    */
    try {
        const state: GameState = {}
        await db.createCrashSave(JSON.stringify(state))
        logger.log("backup successfully created")
    } catch(err) {
        /* 
            lol, at this point, the game has given up on try to save
            the current game state
        */
        logger.error("backup protocol failed, error:", err)
    } finally {
        const stream = renderingThreadStream(
            renderingThreadCodes.readyForRestart,
            generateStreamId()
        )
        sendToRenderingThread(stream)
    }
}

gameLoop()
