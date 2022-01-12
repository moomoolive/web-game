import { createApp } from "vue"
import App from "./App.vue"
import { vuetify } from "./plugins/vuetify"
import router from "./router"
import { store, key } from "./store/index"
import "./styles/global.scss"
import "./styles/tailwind.scss"
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"
import { library } from "@fortawesome/fontawesome-svg-core"
import icons from "./icons.config"
library.add(...icons)

const app = createApp(App)
app.component("font-awesome-icon", FontAwesomeIcon)
app.use(store, key).use(router).use(vuetify).mount("#app")
