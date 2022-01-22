export type ThreadExecutor = (data: Float64Array) => void

export type MainThreadEventHandler = "keyUp" |
    "keyDown" |
    "renderingPingAcknowledged" |
    "prepareForRestart"

export type RenderingThreadHandler = "keyDownResponse" |
    "keyUpResponse" |
    "acknowledgePing" |
    "respondToFatalError" |
    "readyForRestart"

export type HelperGameThreadHandler = "acknowledgePing"

export type MainThreadHelperHandler = "helperPingAcknowledged" |
    "jobCouldNotComplete"

export type ThreadHandler = (() => void) |
    ((payload: Float64Array) => void ) |
    ((payload: Float64Array, meta: string[]) => void) |
    ((payload: Float64Array, meta: string[], id: number) => void)


export type MainThreadEventHandlerLookup = {
    [key in MainThreadEventHandler]: ThreadHandler
}

export type RenderingThreadHandlerLookup = {
    [key in RenderingThreadHandler]: ThreadHandler
}

export type HelperGameThreadHandlerLookup = {
    [key in HelperGameThreadHandler]: ThreadHandler
}

interface ThreadMessage<T> {
    handler: T,
    payload: Float64Array,
    meta: string[]
    id: number
}

export type MainThreadEventMessage = ThreadMessage<MainThreadEventHandler>
export type RenderingThreadMessage = ThreadMessage<RenderingThreadHandler>
export type HelperGameThreadMessage = ThreadMessage<HelperGameThreadHandler>
export type MainThreadHelperMessage = ThreadMessage<MainThreadHelperHandler>