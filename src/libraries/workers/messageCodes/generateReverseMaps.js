// this is a node script, not to be used on client side
const fs = require("fs")
const path = require("path")

const CURRENT_FILE_NAME = "generateReverseMaps.js"
const THREAD_CODES_ENUM_TOKEN_START = "const enum"

const allFilesInCurrentDirectory = fs.readdirSync(__dirname)
const targetFiles = allFilesInCurrentDirectory.filter(name => name !== CURRENT_FILE_NAME)

console.log("🖥️  generating reverse maps and reverse map union types based on thread codes...")

for (const filename in targetFiles) {
    const filePath = path.join(__dirname, "/" + filename)
    const fileString = fs.readFileSync(filePath, { encoding: "utf8" })

    const GENERATED_BY_SCRIPT_START = `/* reverse map and union type generated by "${CURRENT_FILE_NAME}", do not change */\n\n`
    const GENERATED_BY_SCRIPT_END = "\n\n/* generated by script end */"

    const [topOfFile, bottomOfFileWithPreviouslyGenerated] = fileString.split(GENERATED_BY_SCRIPT_START)
    const [previouslyGenerated, bottomOfFile] = bottomOfFileWithPreviouslyGenerated.split(GENERATED_BY_SCRIPT_END)
    const cleanedFile = topOfFile + bottomOfFile

    const [junk, stringWithEnums] = fileString.split(THREAD_CODES_ENUM_TOKEN_START)
    const [enumToken, junk2] = stringWithEnums.split("}")
    const [enumIdentifer, enumValues] = enumToken.split("{")
    const allEnumsListed = enumValues.split(",")
    const allEnumsListedWithoutWhiteSpace = allEnumsListed.map(enumValue => {
        return enumValue.replace(/(\s+|{|})/gmi, "")
    })
    const enumKeyValuePairs = allEnumsListedWithoutWhiteSpace.map(enumPair => {
        const [key, value] = enumPair.split("=")
        return { key, value: parseInt(value) }
    })

    const enumIdentiferClean = enumIdentifer.trim()

    const reverseMapIdentifier = enumIdentiferClean + "ReverseMap"

    let reverseMapString = "export const " + reverseMapIdentifier + " = {\n" 
    enumKeyValuePairs.forEach(data => {
        reverseMapString += `\t${data.value}: "${data.key}", \n`
    })
    reverseMapString += "} as const"

    const enumReverseMapUnionType = enumIdentiferClean.charAt(0).toUpperCase() + enumIdentiferClean.slice(1)
    reverseMapString += "\n\nexport type " + enumReverseMapUnionType + "= keyof typeof " + reverseMapIdentifier

    const generatedTypes = `${GENERATED_BY_SCRIPT_START}${reverseMapString}${GENERATED_BY_SCRIPT_END}`
    const output = cleanedFile + generatedTypes

    const outputPath = path.join(__dirname, filename)
    fs.writeFileSync(outputPath, output)
    console.log("\n📁", filename, "finished")
}

console.log("\n✅ all done")