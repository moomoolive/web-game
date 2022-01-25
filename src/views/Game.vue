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

        <v-fade-transition>
            <div 
                class="fixed w-screen h-screen flex items-center justify-center z-10 bg-overlay-0.5"
                v-show="showFatalErrorMessage"
            >
                <div class="w-5/6 max-w-screen-sm min-w-250">
                    <v-card elevation="2" class="p-2">
                        <v-card-title 
                            class="text-h4"
                        >
                            <span class="mr-3 text-yellow-300">
                                <font-awesome-icon :icon="faExclamationTriangle" />
                            </span>

                            An Error Occurred
                        </v-card-title>

                        <v-card-text>
                            If you're seeing this message, something pretty serious has probably occurred.
                            We're attempting to resolve the issue and restore your game state. If
                            you're hosting a local multiplayer game you'll most likely need to reconnect
                            the users again.

                            <div class="text-sky-500 mt-3 text-right">
                                resolving issue
                                <loadingSpinner class="ml-1"/>
                            </div>
                        </v-card-text>

                        
                        <v-card class="bg-neutral-800 mt-2">
                            <button 
                                class="flex items-center w-full"
                                @click="showErrorDetails = !showErrorDetails"
                            >
                                <div class="w-1/2">
                                    <v-card-title class="text-lg">
                                        <span class="mr-2 text-sky-500">
                                            <font-awesome-icon :icon="faInfoCircle"/>
                                        </span>
                                        Details
                                    </v-card-title>
                                </div>
                                
                                <div class="w-1/2 text-right mr-3">
                                    <font-awesome-icon v-if="!showErrorDetails" :icon="faChevronDown"/>
                                    <font-awesome-icon v-else :icon="faChevronUp"/>
                                </div>
                            </button>

                            <v-expand-transition>
                                <div v-show="showErrorDetails">
                                    <v-card-text>
                                        <div class="mb-1 text-sky-500 underline">
                                            Likely error source:
                                        </div>

                                        <div class="mb-3">
                                            {{ fatalErrorSource }}
                                        </div>

                                        <div class="mb-1 text-sky-500 underline">
                                            Engine log:
                                        </div>

                                        {{ fatalErrorDetails }}
                                    </v-card-text>

                                    <v-card-text class="text-yellow-300">
                                        Check the browser console for more details
                                    </v-card-text>
                                </div>
                            </v-expand-transition>
                        </v-card>

                        <v-card-actions>
                            <v-spacer></v-spacer>

                            <v-btn 
                                color="info" 
                                variant="text"
                                :disabled="!allowFatalErrorMessageToClose" 
                                @click="game.closeFatalMessageNotice()"
                            >
                                close
                            </v-btn>
                        </v-card-actions>
                        
                    </v-card>
                </div>
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
import { 
    faPause, 
    faPlay, 
    faVideo, 
    faBars,
    faChevronDown,
    faChevronUp,
    faInfoCircle,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'
import { 
    VBtn, 
    VCard, 
    VFadeTransition,
    VCardTitle,
    VCardText,
    VExpandTransition,
    VCardActions,
    VSpacer
} from 'vuetify'

import { createGame } from '@/libraries/gameEngine/index'
import { useActions } from '@/store/lib'
import loadingSpinner from '@/components/misc/loadingSpinner.vue'
import { sleepSeconds } from '@/libraries/misc'

const router = useRouter()
const { confirm } = useActions()

const FPS_METER = 0
const performanceMeter = new Stats()
performanceMeter.showPanel(FPS_METER)

const game = createGame({ 
    developmentMode: true, 
    performanceMeter,
})
game.initialize()
document.body.appendChild(game.domElement())
document.body.appendChild(performanceMeter.dom)

// these are readonly; change can only be made from
// inside game engine
const { 
    paused, 
    showMenu, 
    debugCameraEnabled, 
    renderCount ,
    fatalErrorDetails,
    fatalErrorSource,
    showFatalErrorMessage,
    allowFatalErrorMessageToClose
} = game.vueRefs()

const showErrorDetails = ref(false)
const showOverlay = ref(true)

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
        await game.waitUntilReady()
        await sleepSeconds(1)    
        game.run()
    } catch(err) {
        console.error("game mounting error", err)
    } finally {
        showOverlay.value = false  
    }
})
</script>

<style scoped lang="scss">

</style>
