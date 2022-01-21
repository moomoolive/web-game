import { WEBGL } from "three/examples/jsm/WebGL.js"

import { globals } from "@/consts"

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

export function threadingIsSupported(): boolean {
    return Boolean(window.Worker)
}

export function deviceHasMultipleCores(): boolean {
    const numberOfCores = navigator.hardwareConcurrency || 1
    return numberOfCores > 1
}

export function webGLIsSupported(): boolean {
    return WEBGL.isWebGLAvailable()
}

export function deviceIsCompatible(): boolean {
    return webGLIsSupported() &&
        deviceHasMultipleCores() &&
        threadingIsSupported() &&
        webAssemblyIsSupported()
}

export async function sleepSeconds(seconds: number): Promise<boolean> {
    return new Promise(resolve => {
        setTimeout(() => resolve(true), seconds * globals.MILLISECONDS_IN_SECOND)
    })
}
export type DeviceType = "mobile" | "desktop" | "console" | "tablet"
// inspiration taken from:
// https://attacomsian.com/blog/javascript-detect-mobile-device
// this is a very naiive implementation; but it's light weight and 
// good enough
export function detectDeviceType(userAgent: string): DeviceType {
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
        return "tablet"
    }
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
        return "mobile"
    }
    else if (/(xbox|playstation|nintendo)/i.test(userAgent)) {
        return "console"
    }
    return "desktop"
}
