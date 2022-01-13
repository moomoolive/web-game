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
            class="mb-4 hover:animate-bounce" 
            @click="$router.push('/game')"
        >
            <font-awesome-icon class="mr-2 text-secondary-color hover:animate-bounce" :icon="['fas', 'gamepad']"/>
            Play
        </v-btn>

        <v-btn color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon class="mr-2 text-secondary-color" :icon="['fas', 'flag-checkered']"/>
            Performance
        </v-btn>

        <v-btn color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon class="mr-2 text-secondary-color" :icon="['fas', 'cog']"/>
            Settings
        </v-btn>

        <v-btn color="surface" x-large block elevation="3">
            <font-awesome-icon class="mr-2 text-secondary-color" :icon="['fas', 'info-circle']"/>
            About
        </v-btn>
    </div>

    <div class="text-sm sm:text-lg fixed bottom-7 left-7 text-gray-200">
        <div class="relative z-0 mb-2">
            <span class="text-green-500 mr-1 relative z-10">
                <font-awesome-icon :icon="['fas', 'globe-americas']"/>
            </span>
             Connection
             <div 
                class="absolute hidden sm:block z-0 top-1.5 left-px w-4 h-4 rounded-full bg-green-500 animate-ping"
            ></div>

            <div 
                class="absolute sm:hidden z-0 top-1.25 left-px w-3 h-3 rounded-full bg-green-500 animate-ping"
            ></div>
        </div>

        <div class="mb-2">
            <span class="text-primary-color ml-0.5 mr-1">
                <font-awesome-icon :icon="['fas', 'code-branch']"/>
            </span>
             v{{ APP_VERSION }}
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { APP_VERSION } from '@/consts'
</script>

<style scoped lang="scss">
.top-1\.25 {
    top: 0.32rem;
}
</style>
