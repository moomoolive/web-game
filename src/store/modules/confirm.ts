import { ActionTree, Module, MutationTree } from "vuex"

import { RootState, ConfirmState } from "@/store/types"

const state: ConfirmState = {
    header: "",
    body: "",
    show: false,
    resolver: Promise.resolve,
}

export interface ModalOptions {
    header: string,
    body: string
}

interface ShowModalOptions extends ModalOptions {
    resolver: (arg1: boolean) => void
}

const enum Mutations {
    showConfirmModal = "showConfirmModal",
    resolveConfirmModal = "resolveConfirmModal"
}

const mutations: MutationTree<ConfirmState> = {
    [Mutations.showConfirmModal](state, payload: ShowModalOptions) {
        state.show = true
        state.resolver = payload.resolver
        state.header = payload.header
        state.body = payload.body
    },
    [Mutations.resolveConfirmModal](state, payload: boolean) {
        state.resolver(payload)
        state.show = false
    }
}

export interface ConfirmActions {
    modal: (options: ModalOptions) => Promise<Boolean>,
    resolveModal: (confirm: boolean) => void
}

export const enum module { name = "confirm" }
export const enum actionNames {
    modal = "confirm/modal",
    resolveModal = "confirm/resolveModal"
}

const actions: ActionTree<ConfirmState, RootState> = {
    async modal({ commit }, options : ModalOptions): Promise<boolean> {
        return new Promise(resolve => {
            const payload: ShowModalOptions = {...options, resolver: resolve }
            commit(Mutations.showConfirmModal, payload)
        })
    },
    resolveModal({ commit }, payload: boolean) {
        commit(Mutations.resolveConfirmModal, payload)
    }
}

export const confirmStore: Module<ConfirmState, RootState> =  {
    namespaced: true,
    mutations,
    actions,
    state
}
