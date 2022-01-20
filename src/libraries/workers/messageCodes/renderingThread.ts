export const enum renderingThreadCodes {
    keyDownResponse = 10_000,
    keyUpResponse = 10_001,
    acknowledgePing = 10_002
}

export const renderingThreadCodesReverseMap = {
    10_000: "keyDownResponse",
    10_001: "keyUpResponse",
    10_002: "acknowledgePing"
}

export type RenderingThreadCodes = keyof typeof renderingThreadCodesReverseMap
