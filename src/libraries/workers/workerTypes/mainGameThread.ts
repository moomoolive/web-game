import { ThreadExecutor } from "@/libraries/workers/types"
import { MainThreadCodes, mainThreadCodes } from "@/libraries/workers/messageCodes/mainThread"
import { renderingThreadCodes } from "@/libraries/workers/messageCodes/renderingThread"
import { mainThreadIdentity } from "@/libraries/workers/devTools/threadIdentities"
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

console.log(mainThreadIdentity(), "thread is running")

self.onerror = mainThreadErrorHandler
self.onmessageerror = mainThreadMessageErrorHandler

type MainThreadFunctionLookup = {
    [key in MainThreadCodes]: ThreadExecutor
}

let emergencyShutdown = { value: false }
let incomingEvents: Float64Array[] = []
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
        console.log(mainThreadIdentity(), "game helper thread", workerId, "responded to ping")
    },
    async [mainThreadCodes.renderingPingAcknowledged](stream: Float64Array) {
        console.log(`${mainThreadIdentity()} rendering thread responded to ping`)
        const { loadFromCrash } = parseEngineOptions(stream)
        if (!loadFromCrash) {
            return
        }
        console.log(mainThreadIdentity(), "loading state from crash save")
        try {
            const res = await db.getLatestCrashSave()
            console.log("latest game crash save", res)
        } catch(err) {
            console.error(mainThreadIdentity(), "loading from crash save failed, error", err)
        }
    },
    [mainThreadCodes.jobCouldNotComplete](_) {},
    [mainThreadCodes.prepareForRestart](_) {
        console.warn(mainThreadIdentity(), "rendering thread has requested restart, probably due to an unrecoverable error")
        console.warn(mainThreadIdentity(), "⚡restarting immediately...")
        console.log(mainThreadIdentity(), "preparing for backup")
        emergencyShutdown.value = true
        /* clear all incoming events that haven't been processed */
        incomingEvents = []
    }
}

self.onmessage = function handleRenderingThreadMessage(message: MessageEvent<Float64Array>) {
    const stream = message.data
    try {
        incomingEvents.push(stream)
    } catch(err) {
        console.warn(mainThreadIdentity(), "couldn't add incoming event to inputs")
        console.warn("stream debug:", streamDebugInfo(stream, "rendering-thread"))
        console.error("error:", err)
    }
}


function handleIncomingEvents() {
    const sucessful: number[] = []
    let allJobsPassed = true
    for (let i = 0; i < incomingEvents.length; i++) {
        const stream = incomingEvents[i]
        try {
            const handler = getThreadStreamHandler(stream) as MainThreadCodes
            HANDLER_LOOKUP[handler](stream)
            sucessful.push(i)
        } catch(err) {
            allJobsPassed = false
            console.warn(`${mainThreadIdentity()} something went wrong when looking up function`)
            console.warn("stream debug:", streamDebugInfo(stream, "rendering-thread"))
            console.error("error:", err)
        }
    }

    if (allJobsPassed) {
        return incomingEvents = []
    }
    for (let i = sucessful.length - 1; i >= 0; i--) {
        const successfulJobIndex = sucessful[i]
        incomingEvents.splice(successfulJobIndex, 1)
    }
}

interface GameState {}

const NO_TIMER_DEFINED = -1 
const MAX_GAME_LOOP_ERROR_RETRIES = 5
const RESET_LOOP_RETRY_COUNT_MILLISECONDS = 3_000

let runGameLoop = true
let loopRetryCount = 0
let resetLoopRetryCountTimerId = NO_TIMER_DEFINED


sendToRenderingThread(
    renderingThreadStream(renderingThreadCodes.acknowledgePing, generateStreamId()),
)
const threadPool = new HelperGameThreadPool({ threadCount: 2 })
await threadPool.initialize()

async function gameLoop() {
    console.log(mainThreadIdentity(), "🔥game loop ready")
    while(runGameLoop) {
        try {
            handleIncomingEvents()
            await yieldForIncomingEvents()
        } catch(err) {
            if (loopRetryCount === MAX_GAME_LOOP_ERROR_RETRIES) {
                console.warn(
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
            console.error(
                mainThreadIdentity(), 
                "an uncaught exception occured in game loop. Restarting! Error:",
                err
            )
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
        handleIncomingEvents()
        console.warn(mainThreadIdentity(), "waiting for rendering thread repsonse")
        await yieldForIncomingEvents()
    }

    /*  
        should only occur on if response comes from rendering;
        * emergency backup
    */
    try {
        const state: GameState = {}
        await db.createCrashSave(JSON.stringify(state))
        console.log(mainThreadIdentity(), "backup successfully created")
    } catch(err) {
        /* 
            lol, at this point, the game has given up on try to save
            the current game state
        */
        console.error(mainThreadIdentity(), "backup protocol failed, error:", err)
    } finally {
        const stream = renderingThreadStream(
            renderingThreadCodes.readyForRestart,
            generateStreamId()
        )
        sendToRenderingThread(stream)
    }
}

gameLoop()
