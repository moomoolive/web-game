<template>
    <div class="fixed w-screen h-screen flex items-center justify-center">

        <v-fade-transition>
            <v-card v-show="showMenu" elevation="2">
                <div class="p-4 w-64">
                    <v-btn color="primary" x-large block elevation="3" class="mb-4" @click="toMainMenu()">
                        <font-awesome-icon class="mr-2 text-cyan-500" :icon="['fas', 'bars']"/>
                        Main Menu
                    </v-btn>

                    <v-btn color="error" x-large block elevation="3" @click="showMenu = false">
                        Close
                    </v-btn>
                </div>
            </v-card>
        </v-fade-transition>
    </div>
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const paused = ref(false)
const showMenu = ref(false)

function toMainMenu() {
    router.push("/main-menu")
}

function toggleMenu(event: KeyboardEvent) {
    const key = event.key.toLowerCase()
    if (key !== 'escape') {
        return
    }
    if (!showMenu.value) {
        showMenu.value = true
        paused.value = true
    } else {
        showMenu.value = false
        paused.value = false
    }

}

window.addEventListener("keyup", toggleMenu)
onUnmounted(() => {
    window.removeEventListener("keyup", toggleMenu)
})

</script>

<style scoped lang="scss">

</style>
