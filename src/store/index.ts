import { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'

interface storeTypes {}
export const key: InjectionKey<Store<storeTypes>> = Symbol()

export const store = createStore<storeTypes>({})
