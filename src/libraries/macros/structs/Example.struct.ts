/* generated by struct compiler */
// generated @ 1644277338560 (unix timestamp)
//
// full schema:
// {"x":"num","y":"num","z":"num","cool":"bool","name":"char"}
import {Char, StructBool, ArrayOfStruct, isStructArray, fastAbsoluteValue} from "./primitives/index"

// this encoding is standard to all structs.
// const enum are used so that the typescript
// compiler can inline all of them at compile time
const enum StructEncoding {
    encodingReservedIndicesCount=4,

    // all reserved indices for encoding 
    encodingPaddingOneIndex=0,
    encodingPaddingTwoIndex=1,
    structSizeIndex=2,
    lengthIndex=3,

    // these values are more or less arbitrary.
    // only use to confirm that data structure
    // was created by this compiler at runtime
    encodingPaddingOneValue=45538,
    encodingPaddingTwoValue=99900,
    
    encodingInformationMissing=-1,
}

// encodings specific to the 'Example' struct
const enum ExampleEncoding {
    // struct size for 'Example' is 5
    // corresponding to fields: 'x', 'y', 'z', 'cool', 'name',
    // defined in schema
    structSize=5,

    // offsets
	xOffset = 0, // typeof number
	yOffset = 1, // typeof number
	zOffset = 2, // typeof number
	coolOffset = 3, // typeof StructBool
	nameOffset = 4, // typeof Char
}

const enum conversions {
    byteToFloat64Factor=4
}

export class Example implements ArrayOfStruct {
    // these are here for sanity checks.
    // not compiled away by typescript.
    // also not used at runtime.
    // can be used as debugging tool
    static readonly structSize = ExampleEncoding.structSize
	static readonly xOffset = ExampleEncoding.xOffset
	static readonly yOffset = ExampleEncoding.yOffset
	static readonly zOffset = ExampleEncoding.zOffset
	static readonly coolOffset = ExampleEncoding.coolOffset
	static readonly nameOffset = ExampleEncoding.nameOffset
    
    static fromBuffer(buffer: ArrayBuffer | SharedArrayBuffer): Example {
        try {
            const array = new Float64Array(buffer)
            return Example.fromFloat64Array(array)
        } catch {
            throw new Error("(STURCT_CONSTRUCTOR_ERROR): input buffer was not an array of struct. Encoding is incorrect")
        }
    }

    static fromFloat64Array(array: Float64Array): Example {
        const isCorrectlyEncoded = isStructArray(array)
        if (!isCorrectlyEncoded) {
            throw new Error("(STURCT_CONSTRUCTOR_ERROR): input array was not an array of struct. Encoding is incorrect")
        }
        const structArray = new Example(0, false, true)
        structArray.setMemory(array)
        return structArray
    }

    private memory: Float64Array
    
    constructor(initialSize: number, shared: boolean, fromPayload: boolean) {
        if (fromPayload) {
            this.memory = new Float64Array()
        } else {
            const requestedMemorySize = fastAbsoluteValue(initialSize)
            const sizeOfOneStructInBytes = (ExampleEncoding.structSize * conversions.byteToFloat64Factor) + (StructEncoding.encodingReservedIndicesCount * conversions.byteToFloat64Factor)
            const BufferClass = shared ? SharedArrayBuffer : ArrayBuffer
            const buffer = new BufferClass(sizeOfOneStructInBytes * requestedMemorySize)
            const memory = new Float64Array(buffer)
            
            // set encoding information
            memory[StructEncoding.encodingPaddingOneIndex] = StructEncoding.encodingPaddingOneValue
            memory[StructEncoding.encodingPaddingTwoIndex] = StructEncoding.encodingPaddingTwoValue
            memory[StructEncoding.structSizeIndex] = ExampleEncoding.structSize
            // end
            
            this.memory = memory
        }
    }

    set(index: number, x: number, y: number, z: number, cool: StructBool, name: Char,) {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
		this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.xOffset] = x
		this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.yOffset] = y
		this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.zOffset] = z
		this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.coolOffset] = cool
		this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.nameOffset] = name.charCodeAt(0)
    }

    xGet(index: number): number {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        const value = this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.xOffset]
        return value as number
    }

    xSet(index: number, value: number) {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.xOffset] = value
    }

    yGet(index: number): number {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        const value = this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.yOffset]
        return value as number
    }

    ySet(index: number, value: number) {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.yOffset] = value
    }

    zGet(index: number): number {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        const value = this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.zOffset]
        return value as number
    }

    zSet(index: number, value: number) {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.zOffset] = value
    }

    coolGet(index: number): StructBool {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        const value = this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.coolOffset]
        return value as StructBool
    }

    coolSet(index: number, value: StructBool) {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.coolOffset] = value
    }

    nameGet(index: number): Char {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        const value = this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.nameOffset]
        return String.fromCharCode(value) as Char
    }

    nameSet(index: number, value: Char) {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        this.memory[StructEncoding.encodingReservedIndicesCount + trueIndex + ExampleEncoding.nameOffset] = value.charCodeAt(0)
    }
 
    indexAsObject(index: number): {x: number, y: number, z: number, cool: StructBool, name: Char,} {
        return {
			x: this.xGet(index),
			y: this.yGet(index),
			z: this.zGet(index),
			cool: this.coolGet(index),
			name: this.nameGet(index),
        }
    }

    indexAsTypedArray(index: number): Float64Array {
        const i = fastAbsoluteValue(index)
        const trueIndex = i * ExampleEncoding.structSize
        const startIndex = StructEncoding.encodingReservedIndicesCount + trueIndex
        return this.memory.slice(startIndex, startIndex + ExampleEncoding.structSize)
    }

    indexAsArray(index: number): [number, number, number, StructBool, Char,] {
        return [
			this.xGet(index),
			this.yGet(index),
			this.zGet(index),
			this.coolGet(index),
			this.nameGet(index),
        ]
    }

    isStructArray(): boolean {
        return isStructArray(this.memory)
    }

    // the number of indices an individual struct
    // takes in array
    // check compiler primitives for reference.
    structSize(): number {
        return this.memory[StructEncoding.structSizeIndex] || StructEncoding.encodingInformationMissing
    }

    // number of structs in array is stored in this array
    // check compiler primitives for reference.
    length(): number {
        return this.memory[StructEncoding.lengthIndex] || StructEncoding.encodingInformationMissing
    }

    getMemory(): Float64Array {
        return this.memory
    }

    setMemory(newMemory: Float64Array) {
        this.memory = newMemory
    }
}
/* struct compiler end */