export interface EngineOptions {
    loadFromCrash: boolean
}

export type EventHandlers = "keyUp" | "keyDown"

export interface MainThreadEvent {
    payload: number[],
    id: number
    handler: EventHandlers
}