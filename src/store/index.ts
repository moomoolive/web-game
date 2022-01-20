import { InjectionKey } from 'vue'
import { createStore, Store, useStore as baseUseStore } from 'vuex'

import { RootState } from "./types"
import { confirmStore } from './modules/confirm'
import { DeviceSpecsStore } from './modules/device'

export const key: InjectionKey<Store<RootState>> = Symbol()

export const store = createStore<RootState>({
    modules: {
        confirm: confirmStore,
        device: DeviceSpecsStore
    }
})

export function useStore(): Store<RootState> {
    return baseUseStore(key)
}
