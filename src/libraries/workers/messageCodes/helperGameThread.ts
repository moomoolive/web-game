export const enum helperGameThreadCodes {
    acknowledgePing = 20_000
}

export const helperGameThreadReverseMap = {
    20_000: "acknowledgePing"
}

export type HelperGameThreadCodes = keyof typeof helperGameThreadReverseMap
