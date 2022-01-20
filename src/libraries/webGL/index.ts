export function garbageCollectWebGLContext(canvas: HTMLCanvasElement) {
    canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext()
    canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext()
}
