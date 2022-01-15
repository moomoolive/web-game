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

enum Mutations {
    SHOW_CONFIRM_MODAL = "showConfirmModal",
    RESOLVE_CONFIRM_MODAL = "resolveConfirmModal"
}

const mutations: MutationTree<ConfirmState> = {
    [Mutations.SHOW_CONFIRM_MODAL](state, payload: ShowModalOptions) {
        state.show = true
        state.resolver = payload.resolver
        state.header = payload.header
        state.body = payload.body
    },
    [Mutations.RESOLVE_CONFIRM_MODAL](state, payload: boolean) {
        state.resolver(payload)
        state.show = false
        state.body = ""
        state.header = ""
    }
}

export interface ConfirmActions {
    modal: (options: ModalOptions) => Promise<Boolean>,
    resolveModal: (confirm: boolean) => void
}

const actions: ActionTree<ConfirmState, RootState> = {
    async modal({ commit }, options : ModalOptions): Promise<boolean> {
        return new Promise(resolve => {
            const payload: ShowModalOptions = {...options, resolver: resolve }
            commit(Mutations.SHOW_CONFIRM_MODAL, payload)
        })
    },
    resolveModal({ commit }, payload: boolean) {
        commit(Mutations.RESOLVE_CONFIRM_MODAL, payload)
    }
}

export const confirmStore: Module<ConfirmState, RootState> =  {
    namespaced: true,
    mutations,
    actions,
    state
}
