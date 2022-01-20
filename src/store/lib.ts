import { useStore } from "./index"

import { ConfirmActions, ModalOptions } from "./modules/confirm"
import { DeviceSpecsActions } from "./modules/device"

interface VuexActions {
    confirm: ConfirmActions
    device: DeviceSpecsActions
}

export function useActions(): Readonly<VuexActions> {
    const store = useStore()
    const actions : Readonly<VuexActions> = {
        confirm: {
            modal(options: ModalOptions): Promise<boolean> {
                const promise = store.dispatch("confirm/modal", options)
                return promise as unknown as Promise<boolean>
            },
            resolveModal(confirm: boolean) {
                store.dispatch("confirm/resolveModal", confirm)
            }
        },
        device: {
            async getCPUSpecs() {
                await store.dispatch("device/getCPUSpecs")
            }
        }
    }
    return actions
}
