export interface ConfirmState {
    header: string,
    body: string,
    show: boolean,
    resolver: (arg1: boolean) => void 
}

export interface DeviceSpecsState {
    estimatedPhysicalCores: number
    totalCores: number
}

export interface RootState {
    confirm: ConfirmState,
    device: DeviceSpecsState
}

