import { MAIN_THREAD_CODES } from "./mainThread"
import { RENDERING_THREAD_CODES } from "./renderingThread"

type allThreadCodes = MAIN_THREAD_CODES |
    RENDERING_THREAD_CODES

type ThreadCodeToFunctionDescription = {
    [key in allThreadCodes]: string
}

export const debugCode = "debug: "

export const descriptions: Readonly<ThreadCodeToFunctionDescription> = {
    [MAIN_THREAD_CODES.HELLO]: debugCode + "pings the main game thread",
    [MAIN_THREAD_CODES.UNKNOWN]: "unknown",
    [RENDERING_THREAD_CODES.RETURN_HELLO]: debugCode + "returns ping from rendering thread",
    [RENDERING_THREAD_CODES.UNKNOWN]: "unknown"
}
