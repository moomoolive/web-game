export interface ConfirmState {
    header: string,
    body: string,
    show: boolean,
    resolver: (arg1: boolean) => void 
}

export interface RootState {
    confirm: ConfirmState
}

