import { ActionTree, Module, MutationTree } from "vuex"
import { WebCPU } from 'webcpu'

import { RootState, DeviceSpecsState } from "@/store/types"

const state: DeviceSpecsState = {
    estimatedPhysicalCores: 1,
    totalCores: 2
}

enum Mutations {
    UPDATE_CPU_SPECS = "updateCPUSpecs"
}

interface CPUSpecs {
    physicalCores: number,
    totalCores: number
}

const mutations: MutationTree<DeviceSpecsState> = {
    [Mutations.UPDATE_CPU_SPECS](state, payload: CPUSpecs) {
        state.estimatedPhysicalCores = payload.physicalCores
        state.totalCores = payload.totalCores
    }
}

export interface DeviceSpecsActions {
    getCPUSpecs: () => Promise<void>
}

const actions: ActionTree<DeviceSpecsState, RootState> = {
    async getCPUSpecs({ commit }) {
        try {
            const { estimatedPhysicalCores } = await WebCPU.detectCPU()
            const payload: CPUSpecs = {
                physicalCores: estimatedPhysicalCores,
                totalCores: navigator.hardwareConcurrency
            }
            commit(Mutations.UPDATE_CPU_SPECS, payload)
        } catch {
            console.warn("an error occured when estimating cpu specs")
        }
    }
}

export const DeviceSpecsStore: Module<DeviceSpecsState, RootState> = {
    namespaced: true,
    mutations,
    actions,
    state
}
