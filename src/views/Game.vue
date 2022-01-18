<template>
    <div>
        <v-fade-transition>
            <div 
                class="fixed w-screen h-screen flex items-center justify-center z-20 bg-app-background"
                v-show="showOverlay"
            >
                <div class="text-center text-2xl">
                    <h1 class="mb-2">
                        Loading
                    </h1>

                    <div class="text-3xl text-primary-color">
                        <loading-spinner />
                    </div>
                </div>
            </div>
        </v-fade-transition>

        <v-fade-transition>
            <div 
                class="fixed w-screen h-screen flex items-center justify-center z-10 bg-overlay-0.5"
                v-show="showMenu"
            >
                <v-card elevation="2">
                    <div class="p-4 w-64">
                        <v-btn 
                            color="primary" 
                            x-large 
                            block 
                            elevation="3" 
                            class="mb-4" 
                            @click="toMainMenu()"
                        >
                            <font-awesome-icon 
                                class="mr-2 text-secondary-color" 
                                :icon="faBars"
                            />
                            Main Menu
                        </v-btn>

                        <v-btn 
                            color="error" 
                            x-large 
                            block 
                            elevation="3" 
                            @click="game.toggleMenu()"
                        >
                            Close
                        </v-btn>
                    </div>
                </v-card>
            </div>
        </v-fade-transition>

        <div class="fixed top-7 right-7 p-2 bg-overlay-0.8">
            Render count: {{ renderCount.toLocaleString("en-US") }}
        </div>

        <div class="fixed bottom-24 left-7">
            <v-btn 
                icon 
                :color="debugCameraEnabled ? 'success' : 'warning'" 
                @click="game.toggleDebugCamera()"
            >
                <font-awesome-icon :icon="faVideo"/>
            </v-btn>
        </div>

        <div class="fixed bottom-7 left-7">
            <v-btn 
                icon 
                :color="!paused ? 'surface' : 'success'" 
                @click="game.togglePause()"
            >
                <font-awesome-icon v-if="!paused" :icon="faPause"/>
                <font-awesome-icon v-else :icon="faPlay"/>
            </v-btn>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Stats from "stats.js"
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPause, faPlay, faVideo, faBars } from '@fortawesome/free-solid-svg-icons'
import { VBtn, VCard, VFadeTransition } from 'vuetify'

import { createGame } from '@/libraries/gameEngine/index'
import { useActions } from '@/store/lib'
import loadingSpinner from '@/components/misc/loadingSpinner.vue'

const router = useRouter()
const { confirm } = useActions()

const FPS_METER = 0
const performanceMeter = new Stats()
performanceMeter.showPanel(FPS_METER)

const game = createGame({ 
    developmentMode: true, 
    performanceMeter,
})
document.body.appendChild(game.domElement())

// these are readonly; change can only be made from
// inside "game"
const { paused, showMenu, debugCameraEnabled, renderCount } = game.vueRefs()

const showOverlay = ref(true)

const milliseconds = 3_000
window.setTimeout(() => showOverlay.value = false, milliseconds)

async function toMainMenu() {
    const consent = await confirm.modal({ 
        header: "Exit Game?",
        body: "Any unsaved progress will be lost" 
    })
    if (!consent) {
        return
    }
    game.toggleMenu()
    router.push("/main-menu")
}

function onKeyUp(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'escape') {
        game.toggleMenu()
    }
}

window.addEventListener("keyup", onKeyUp)
onUnmounted(() => {
    window.removeEventListener("keyup", onKeyUp)
    game.destroy()
    document.body.removeChild(game.domElement())
    document.body.removeChild(performanceMeter.dom)
})
 
onMounted(async () => {
    try {
        await game.initialize() 
        const milliseconds = 2_000
        window.setTimeout(() => {
            document.body.appendChild(game.domElement())
            document.body.appendChild(performanceMeter.dom)
            game.run() 
        }, milliseconds)       
    } catch(err) {
        console.error("game mounting error", err)
    }
})
</script>

<style scoped lang="scss">

</style>
