import { RouteRecordRaw } from "vue-router"

import TechUsed from "@/views/preGameScreens/TechUsed.vue"
import AutoSaveNotice from "@/views/preGameScreens/AutoSaveNotice.vue"
import DeviceCompatiblity from "@/views/preGameScreens/DeviceCompatiblity.vue"

const routes: RouteRecordRaw[] = [
    {
        path: '/tech-used',
        name: 'TechUsed',
        component: TechUsed,
    },
    {
        path: "/auto-save-notice",
        name: "AutoSaveNotice",
        component: AutoSaveNotice
    },
    {
        path: "/device-compatiblity",
        name: "DeviceCompatiblity",
        component: DeviceCompatiblity
    }
]

export default routes 
