import { useStore } from "./index"

import { ConfirmActions, ModalOptions } from "./modules/confirm"

interface VuexActions {
    confirm: ConfirmActions
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
        }
    }
    return actions
}
