import { useStore } from "./index"

import { ConfirmActions, ModalOptions, actionNames as confirmActions } from "./modules/confirm"
import { DeviceSpecsActions, actionNames as deviceActions } from "./modules/device"

interface VuexActions {
    confirm: ConfirmActions
    device: DeviceSpecsActions
}

export function useActions(): Readonly<VuexActions> {
    const store = useStore()
    const actions : Readonly<VuexActions> = {
        confirm: {
            modal(options: ModalOptions): Promise<boolean> {
                const promise = store.dispatch(confirmActions.modal, options)
                return promise as unknown as Promise<boolean>
            },
            resolveModal(confirm: boolean) {
                store.dispatch(confirmActions.resolveModal, confirm)
            }
        },
        device: {
            async getCPUSpecs() {
                await store.dispatch(deviceActions.getCPUSpecs)
            }
        }
    }
    return actions
}
