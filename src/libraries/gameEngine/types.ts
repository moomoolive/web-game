import { Ref } from "vue"
import Stats from "stats.js"

export interface GameOptions {
    developmentMode: boolean
    performanceMeter: Stats
}

export type VueRef<T> = Readonly<Ref<T>>

export interface UIReferences {
    paused: VueRef<boolean>
    showMenu: VueRef<boolean>
    debugCameraEnabled: VueRef<boolean>
    renderCount: VueRef<number>
}

export interface Game {
    vueRefs: () => UIReferences
    domElement: () => HTMLCanvasElement
    initialize: () => Promise<void>
    destroy: () => void
    run: () => void
    togglePause: () => void
    toggleMenu: () => void
    enableDebugCamera: () => void
    disableDebugCamera: () => void
    toggleDebugCamera: () => void
}

export interface EngineOptions {
    loadFromCrash: boolean
}