let entityIdCounter = 0

export class EntityMananger {
    entities: Entity[] = []
    index: EntityIndex = {}

    createEnitity(hasController: boolean): number {
        const id = entityIdCounter
        entityIdCounter++
        this.entities.push({ id, hasController })
        this.index[id] = this.entities.length - 1
        return id
    }

    query(filterFunction: (entity: Entity) => boolean): number[] {
        const queryResult = []
        const allEntities = this.entities
        for (let i = 0; i < allEntities.length; i++) {
            const entity = allEntities[i]
            const pass = filterFunction(entity)
            if (pass) {
                queryResult.push(entity.id)
            }
        }
        return queryResult
    }
}

interface Entity {
    id: number
    /* components may be implemented in a more efficent way after */
    hasController: boolean
}

type EntityIndex = {
    [key: number]: number
}