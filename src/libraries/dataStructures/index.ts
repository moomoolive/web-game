export class Reference<T> {
    readonly value: T

    constructor(value: T) {
        this.value = value
    }

    set(value: T) {
        (this.value as T) = value 
    }
}
