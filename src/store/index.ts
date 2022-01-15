import { InjectionKey } from 'vue'
import { createStore, Store, useStore as baseUseStore } from 'vuex'

import { RootState } from "./types"
import { confirmStore as confirm } from './modules/confirm'

export const key: InjectionKey<Store<RootState>> = Symbol()

export const store = createStore<RootState>({
    modules: {
        confirm
    }
})

export function useStore(): Store<RootState> {
    return baseUseStore(key)
}
