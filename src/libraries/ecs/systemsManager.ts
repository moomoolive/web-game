let systemIdCounter = 0

export class SystemManager {
    pool: System[] = []
    index: { [key: string]: number } = {}

    constructor() {}

    addSystem(name: string, updateHandler: Function): number {
        const id = systemIdCounter
        systemIdCounter++
        this.pool.push({ id, name, update: updateHandler })
        this.index[name] = this.pool.length - 1
        return id
    }
}

interface System {
    id: number
    name: string
    update: Function
}
