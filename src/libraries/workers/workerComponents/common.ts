let threadIdCounter = 0
export function generateMessageId(): number {
    const id = threadIdCounter
    threadIdCounter++
    return id
}
