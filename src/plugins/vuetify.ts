import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/lib/styles/main.sass'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/lib/components'
import * as directives from 'vuetify/lib/directives'

export const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#7C3AED',
          background: '#35495e',
          error: '#DC2626',
          info: '#2563EB',
          secondary: '#0891B2',
          success: '#16A34A',
          surface: '#404040',
          warning: '#CA8A04',
        },
        dark: true,
        variables: {},
      },
    },
  },
})
