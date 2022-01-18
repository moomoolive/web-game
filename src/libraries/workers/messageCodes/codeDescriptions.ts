import { mainThreadCodes } from "./mainThread"
import { renderingThreadCodes } from "./renderingThread"
import { helperGameThreadCodes } from "./helperGameThread"

type allThreadCodes = mainThreadCodes |
    renderingThreadCodes |
    helperGameThreadCodes

type ThreadCodeToFunctionDescription = {
    [key in allThreadCodes]: string
}

export const debugCode = "debug: "

export const descriptions: Readonly<ThreadCodeToFunctionDescription> = {
    [mainThreadCodes.PING]: debugCode + "pings the main game thread",
    [mainThreadCodes.KEY_DOWN]: "sends keycode of pressed keyboard key",
    [mainThreadCodes.KEY_UP]: "sends keycode of unpressed keyboard key",
    [mainThreadCodes.ACKNOWLEDGE_HELPER_PING]: debugCode + "acknowledges ping attempt from worker thread",
    [renderingThreadCodes.RETURN_PING]: debugCode + "returns ping from rendering thread",
    [renderingThreadCodes.KEY_DOWN_RESPONSE]: "not documented",
    [renderingThreadCodes.KEY_UP_RESPONSE]: "not documented",
    [helperGameThreadCodes.PING]: debugCode + "pings a helper game thread (workers that are managed by the main thread)"
}
