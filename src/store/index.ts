import { InjectionKey } from 'vue'
import { createStore, Store, useStore as baseUseStore } from 'vuex'

import { RootState } from "./types"
import { confirmStore, module as cM } from './modules/confirm'
import { DeviceSpecsStore, module as dM } from './modules/device'

export const key: InjectionKey<Store<RootState>> = Symbol()

export const store = createStore<RootState>({
    modules: {
        [cM.name]: confirmStore,
        [dM.name]: DeviceSpecsStore
    }
})

export function useStore(): Store<RootState> {
    return baseUseStore(key)
}
