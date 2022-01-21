import { duplicateThreadStreamPayload } from "@/libraries/workers/threadStreams/streamOperators"

export interface EngineOptions {
    loadFromCrash: boolean
}

export function createGameEngineOptions(options: EngineOptions): Float64Array {
    return new Float64Array([
        options.loadFromCrash ? 1 : 0
    ])
}

export function parseEngineOptions(stream: Float64Array): EngineOptions {
    const [
        loadFromCrash
    ] = duplicateThreadStreamPayload(stream)
    return { 
        loadFromCrash: loadFromCrash === 1
    }
}