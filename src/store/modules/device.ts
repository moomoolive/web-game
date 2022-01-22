import { ActionTree, Module, MutationTree } from "vuex"
import { WebCPU } from 'webcpu'

import { DeviceType } from "@/libraries/misc"
import { RootState, DeviceSpecsState } from "@/store/types"
import { detectDeviceType } from "@/libraries/misc"

const HYPER_THREADING_MULTIPLIER = 2

const ESTIMATED_PHYSICAL_CORES_LOCALSTORAGE_KEY = "estimated-physical-cores"
const REPORTED_CORES_LOCALSTORAGE_KEY = "reported-cores"

function initializePhysicalCores(): number {
    const physicalCores = window.localStorage.getItem(ESTIMATED_PHYSICAL_CORES_LOCALSTORAGE_KEY)
    if (!physicalCores) {
        // assumption: device is hyperthreaded
        return Math.round(navigator.hardwareConcurrency / HYPER_THREADING_MULTIPLIER)
    } else {
        return parseInt(physicalCores)
    }
}

function initalizeTotalCores(): number {
    const totalCores = window.localStorage.getItem(REPORTED_CORES_LOCALSTORAGE_KEY)
    if (!totalCores) {
        return navigator.hardwareConcurrency
    } else {
        return parseInt(totalCores)
    }
}

function currentDeviceType(): DeviceType {
    return detectDeviceType(navigator.userAgent)
}

const state: DeviceSpecsState = {
    estimatedPhysicalCores: initializePhysicalCores(),
    totalCores: initalizeTotalCores(),
    type: currentDeviceType()
}

const enum Mutations {
    updateCPUSpecs = "updateCPUSpecs"
}

interface CPUSpecs {
    physicalCores: number,
    totalCores: number
}

const mutations: MutationTree<DeviceSpecsState> = {
    [Mutations.updateCPUSpecs](state, payload: CPUSpecs) {
        state.estimatedPhysicalCores = payload.physicalCores
        state.totalCores = payload.totalCores
    }
}

export interface DeviceSpecsActions {
    getCPUSpecs: () => Promise<void>
}

export const enum module { name = "device" }
export const enum actionNames {
    getCPUSpecs = "device/getCPUSpecs"
}

const actions: ActionTree<DeviceSpecsState, RootState> = {
    async getCPUSpecs({ commit }) {
        try {
            const { estimatedPhysicalCores, reportedCores } = await WebCPU.detectCPU()
            const payload: CPUSpecs = {
                physicalCores: estimatedPhysicalCores,
                totalCores: reportedCores || estimatedPhysicalCores * HYPER_THREADING_MULTIPLIER
            }
            commit(Mutations.updateCPUSpecs, payload)
            window.localStorage.setItem(ESTIMATED_PHYSICAL_CORES_LOCALSTORAGE_KEY, JSON.stringify(estimatedPhysicalCores))
            window.localStorage.setItem(REPORTED_CORES_LOCALSTORAGE_KEY, JSON.stringify(reportedCores))
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
