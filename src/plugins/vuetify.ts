import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/lib/styles/main.sass'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/lib/components'
import * as directives from 'vuetify/lib/directives'

import colors from "@/styles/variables.scss"

interface ColorExport {
  primaryColor: string
  secondaryColor: string
  surfaceColor: string
  backgroundColor: string
}

type ColorExportMember = keyof ColorExport

function parseSCSSExport(scssExportExpression: string): ColorExport {
  const colorsObject = scssExportExpression.split(":export")[1]
  if (!colorsObject) {
    throw new Error("SASS_PARSE_ERROR: no ':export' statement found in sass source file")
  }
  const withoutSemicolons = colorsObject.replace(/;/gmi, ",")
  const withoutSpacesAndBrackets = withoutSemicolons.replace(/(\s+|{|})/gmi, "")
  const keyValuePairs = withoutSpacesAndBrackets
    .split(",")
    .filter((keyValuePair: string) => keyValuePair !== "")
  const colorExport: ColorExport = {
    primaryColor: "none",
    secondaryColor: "none",
    surfaceColor: "none",
    backgroundColor: "none"
  }
  for (const keyValuePair of keyValuePairs) {
    const [key, value] = keyValuePair.split(":")
    if (!colorExport[key as ColorExportMember]) {
      continue
    }
    colorExport[key as ColorExportMember] = value
  }
  return colorExport
}

const { primaryColor, secondaryColor, surfaceColor, backgroundColor } = parseSCSSExport(colors)

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        colors: {
          primary: primaryColor,
          background: backgroundColor,
          error: '#DC2626',
          info: '#2563EB',
          secondary: secondaryColor,
          success: '#16A34A',
          surface: surfaceColor,
          warning: '#CA8A04',
        },
        dark: true,
        variables: {},
      },
    },
  },
})
