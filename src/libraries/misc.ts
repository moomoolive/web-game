import { MILLISECONDS_IN_SECOND } from "@/consts"

export function webAssemblyIsSupported(): boolean {
    try {
        if (typeof WebAssembly !== "object" || typeof WebAssembly.instantiate !== "function") {
            return false
        }
        const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00))
        if (module instanceof WebAssembly.Module) {
            return new WebAssembly.Instance(module) instanceof WebAssembly.Instance
        }
        return false
    } catch {
        console.warn("This browser doesn't support web assembly")
        return false
    }
}

export function coreTechonologiesSupported(): boolean {
    const threadingIsSupported = Boolean(window.Worker)
    return threadingIsSupported && webAssemblyIsSupported()
}

export async function sleepSeconds(seconds: number): Promise<boolean> {
    return new Promise(resolve => {
        window.setTimeout(() => resolve(true), seconds * MILLISECONDS_IN_SECOND)
    })
}
