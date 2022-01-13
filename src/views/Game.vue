<template>
    <div>
        <v-fade-transition>
            <div 
                class="fixed w-screen h-screen flex items-center justify-center z-10 bg-neutral-500-0.5"
                v-show="showMenu"
            >
                <v-card elevation="2">
                    <div class="p-4 w-64">
                        <v-btn color="primary" x-large block elevation="3" class="mb-4" @click="toMainMenu()">
                            <font-awesome-icon class="mr-2 text-cyan-500" :icon="['fas', 'bars']"/>
                            Main Menu
                        </v-btn>

                        <v-btn color="error" x-large block elevation="3" @click="toggleMenu()">
                            Close
                        </v-btn>
                    </div>
                </v-card>
            </div>
        </v-fade-transition>

        <div class="fixed top-7 left-7 p-2 bg-neutral-500-0.8">
            Render Count {{ renderCount }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onUnmounted, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { World } from '@/libraries/world/basic'

const router = useRouter()

const showMenu = ref(false)
const renderCount = ref(0)
const world = new World()
world.setEagerUpdateHook(() => renderCount.value++)

function toMainMenu() {
    router.push("/main-menu")
}

function toggleMenu() {
    if (!showMenu.value) {
        showMenu.value = true
        world.pause()
    } else {
        showMenu.value = false
        world.run()
    }
}

function onKeyUp(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'escape') {
        toggleMenu()
    }
}

window.addEventListener("keyup", onKeyUp)
onUnmounted(() => {
    window.removeEventListener("keyup", onKeyUp)
    world.destroy()
})

onMounted(() => { world.run() })
</script>

<style scoped lang="scss">

</style>
