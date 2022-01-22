import { mainThreadIdentity, renderingThreadIdentity } from "./threadIdentities"

export function createLogger(threadIdentity: () => string) {

    return {
        log(...args: any[]) {
            console.log(threadIdentity(), ...args)
        },
        warn(...args: any[]) {
            console.warn(threadIdentity(), ...args)
        },
        error(...args: any[]) {
            console.error(threadIdentity(), ...args)
        },
    }
}

export const mainThreadLogger = createLogger(mainThreadIdentity)
export const renderingThreadLogger = createLogger(renderingThreadIdentity)
