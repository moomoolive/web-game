// codesReverseMap must have all the values
// in the "codes" enum; this must be check by hand
// I couldn't find a way for typescript to do this for
// me
export const enum mainThreadCodes {
    keyDown = 1,
    keyUp = 2,
    helperPingAcknowledged = 3,
    renderingPingAcknowledged = 4
}

export const mainThreadCodesReverseMap = {
    1: "keyDown",
    2: "keyUp",
    3: "helperPingAcknowledged",
    4: "renderingPingAcknowledged"
} as const

export type MainThreadCodes = keyof typeof mainThreadCodesReverseMap
