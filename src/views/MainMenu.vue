<template>
  <div class="fixed w-screen h-screen flex items-center justify-center text-2xl sm:text-3xl">
    
    <div class="text-center relative z-10">
        <h1 class="text-2xl sm:text-4xl mb-4">
            Welcome to Web Game
        </h1>

        <v-btn 
            color="surface" 
            x-large 
            block 
            elevation="3" 
            class="mb-4" 
            @click="$router.push('/game')"
            :disabled="!browserIsCompatible"
        >
            <font-awesome-icon class="mr-2 text-cyan-500" :icon="['fas', 'gamepad']"/>
            Play
        </v-btn>

        <v-btn color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon class="mr-2 text-cyan-500" :icon="['fas', 'flag-checkered']"/>
            Performance
        </v-btn>

        <v-btn color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon class="mr-2 text-cyan-500" :icon="['fas', 'cog']"/>
            Settings
        </v-btn>

        <v-btn color="surface" x-large block elevation="3">
            <font-awesome-icon class="mr-2 text-cyan-500" :icon="['fas', 'info-circle']"/>
            About
        </v-btn>
    </div>

    <v-expand-transition>
        <v-alert
            class="fixed z-20 bottom-7 left-7 text-base"
            :type="alertType"
            v-show="showCompatiblityAlert"
        >
            {{ alertText }}
            <loading-spinner class="ml-2" v-show="alertType === 'info'" />
        </v-alert>
    </v-expand-transition>

    <div v-show="showIndicators" class="text-sm sm:text-lg fixed z-0 bottom-7 left-7">
        <div class="mb-2">
            <span v-if="alertType === 'error'" class="text-red-500 mr-1">
                <font-awesome-icon :icon="['fas', 'times']"/>
            </span>
            <span v-else class="text-green-500 mr-1">
                <font-awesome-icon :icon="['fas', 'check']"/>
            </span>

            device
        </div>

        <div class="mb-2">
            <span class="text-green-500 mr-1">
                <font-awesome-icon class="animate-pulse" :icon="['fas', 'globe-americas']"/>
            </span>

             connection
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import loadingSpinner from '@/components/loadingSpinner.vue'
import { coreTechonologiesSupported, sleepSeconds } from '@/libraries/misc'

const browserIsCompatible = ref(false)
const showCompatiblityAlert = ref(false)
const alertText = ref("Checking browser compatibility")
const alertType = ref("info")
const showIndicators = ref(false)

async function checkBrowserCompatiblity() {
    await sleepSeconds(0.5)
    showCompatiblityAlert.value = true
    await sleepSeconds(2)
    if (coreTechonologiesSupported()) {
        browserIsCompatible.value = true
    }
    if (browserIsCompatible.value) {
        alertType.value = "success"
        alertText.value = "You're good to go!"
    } else {
        alertType.value = "error"
        alertText.value = "Your browser is not compatible"
    }
    await sleepSeconds(3)
    showCompatiblityAlert.value = false
    showIndicators.value = true
}
checkBrowserCompatiblity()

</script>

<style scoped lang="scss">

</style>
