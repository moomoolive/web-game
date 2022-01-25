import { EntityMananger } from "./entityManager"
import { SystemManager } from "./systemsManager"
import { ComponentManager } from "./componentManager"
import { MainThreadEvent } from "@/libraries/gameEngine/types"

export class ECS {
    entityManager = new EntityMananger()
    systemsManager = new SystemManager()
    componentManager = new ComponentManager()

    createEntity(hasController: boolean): number {
        return this.entityManager.createEnitity(hasController)
    }

    addSystem(name: string, updateHandler: Function): number {
        return this.systemsManager.addSystem(name, updateHandler)
    }

    update(context: SystemsContext) {
        const systems = this.systemsManager.pool
        for (let i = 0; i < systems.length; i++) {
            systems[i].update(context)
        }
    }
}

interface SystemsContext {
    incomingEventsQueue: MainThreadEvent[]
}