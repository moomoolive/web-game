export class ComponentManager {
    controller: ControllerComponent[] = []
}

type ControllerEvents = "keyboard"

interface ControllerComponent {
    entityId: number
    targetEvents: ControllerEvents
}