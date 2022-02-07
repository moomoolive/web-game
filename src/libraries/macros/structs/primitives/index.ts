export type StructBool = 0 | 1

// char is made up by the most convientent ascii
// codes (most common codes between 0-126)
// ascii reference: https://www.cs.cmu.edu/~pattis/15-1XX/common/handouts/ascii.html
export type Char = UppercaseLetters | 
LowercaseLetters | 
CommonEscapeCharacters |
CommonSpecialSymbols

export type Primitive = Char | StructBool | number

export interface ArrayOfStruct {
    indexAsObject: (index: number) => StructObjectRepersentation
    indexAsTypedArray: (index: number) => TypedArray
    indexAsArray: (index: number) => StructArrayRepersentation
    length: () => number
    structSize: () => number
    getMemory: () => TypedArray
    setMemory: ((newMemory: Float64Array) => void) |
    ((newMemory: Uint8Array) => void)
    isStructArray: () => boolean
}

const paddingOneValue = 45538
const paddingTwoValue = 99900

export function isStructArray(array: TypedArray): boolean {
    try {
        if (array.constructor !== Float64Array || array.constructor !== Uint8Array) {
            return false
        }
        const frontPaddingIsCorrect = array[0] === paddingOneValue
        const backPaddingIsCorrect = array[1] === paddingTwoValue
        return frontPaddingIsCorrect && backPaddingIsCorrect
    } catch {
        return false
    }
}

export function fastAbsoluteValue(input: number): number {
    return (input + (input >> 31)) ^ (input >> 31)
}

type StructObjectRepersentation = {
    [key: string]: Primitive
}

type TypedArray = Float64Array | Uint8Array

type StructArrayRepersentation = Primitive[]

type UppercaseLetters = "A" |
"B" |
"C" |
"D" |
"E" |
"F" |
"G" |
"H" |
"I" |
"J" |
"K" |
"L" |
"M" |
"N" |
"O" |
"P" |
"Q" |
"R" |
"S" |
"T" |
"U" |
"V" |
"W" |
"X" |
"Y" |
"Z"

type LowercaseLetters = "a" |
"b" |
"c" |
"d" |
"e" |
"f" |
"g" |
"h" |
"i" |
"j" |
"k" |
"l" |
"m" |
"n" |
"o" |
"p" |
"q" |
"r" |
"s" |
"t" |
"u" |
"v" |
"w" |
"x" |
"y" |
"z" 

// take from: https://www.w3schools.com/js/js_strings.asp
type CommonEscapeCharacters = "\n" | "\t" | "\b" | "\f" | "\r" | "\v"

type CommonSpecialSymbols = "!" |
"#" |
"$" |
"%" |
"&" |
"'" |
"(" |
")" |
"*" |
"+" |
"," |
"-" |
"." |
"/" |
"[" |
"]" |
"^" |
"_" |
"`" |
"{" |
"|" |
"}" |
"~" 