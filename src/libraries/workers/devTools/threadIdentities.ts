// thread identities are essentially tags that will be
// printed when a worker (web worker) prints to the console
// example: "[main thread]: WHAT_EVER_YOUR_MESSAGE_IS" 

function identityTag(name: string): string {
    return `[${name}]:`
}

export function mainThreadIdentity(): string {
    return identityTag("👑main thread")
}

export function renderingThreadIdentity(): string {
    return identityTag("🎨rendering thread")
}

export function helperGameThreadIdentity(threadId: string): string {
    return identityTag("🔨game helper " + threadId)
}
