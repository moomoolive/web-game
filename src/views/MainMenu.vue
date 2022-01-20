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
        >
            <span>
                <font-awesome-icon 
                    class="mr-1 text-secondary-color animate-bounce" 
                    :icon="faGamepad"
                />
            </span>
            New Game
        </v-btn>

        <v-btn :disabled="true" color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon 
                class="mr-2 text-secondary-color" 
                :icon="faUpload"
            />
            Load
        </v-btn>

        <v-btn :disabled="true" color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon 
                class="mr-2 text-secondary-color" 
                :icon="faUserFriends"
            />
            Multiplayer
        </v-btn>

        <v-btn color="surface" x-large block elevation="3" class="mb-4">
            <font-awesome-icon 
                class="mr-2 text-secondary-color" 
                :icon="faCog"
            />
            Settings
        </v-btn>

        <v-btn color="surface" x-large block elevation="3">
            <font-awesome-icon 
                class="mr-2 text-secondary-color" 
                :icon="faInfoCircle"
            />
            About
        </v-btn>
    </div>

    <div class="text-sm sm:text-lg fixed bottom-7 left-7 text-gray-200">
        <div class="mb-2">
            <check-or-times class="mr-1" :check="deviceStatus" />
             Device
        </div>
        
        <div class="relative z-0 mb-2">
            <span class="text-green-500 mr-1 relative z-10">
                <font-awesome-icon :icon="faGlobeAmericas"/>
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
                <font-awesome-icon :icon="faCodeBranch"/>
            </span>
             v{{ APP_VERSION }}
        </div>
    </div>

    <!-- make user select device type on first visit => TODO -->
    <v-fade-transition>
        <div 
            class="fixed w-screen h-screen z-10 flex items-center justify-center bg-overlay-0.5"
            v-show="false"  
        >
        <div class="w-5/6 max-w-screen-sm min-w-250">
            <v-card elevation="2">
            <v-card-title class="text-h5">
                Device Type
            </v-card-title>

            <span>
                <v-card-text>
                    Plz choose input device
                </v-card-text>

                <v-divider></v-divider>
            </span>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn 
                color="primary" 
                text 
                
                >
                Okay
                </v-btn>
                
                <v-btn 
                color="primary" 
                text
                
                >
                Cancel
                </v-btn>
            </v-card-actions>
            </v-card>
        </div>
        </div>
    </v-fade-transition>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
    VBtn, 
    VCard, 
    VSpacer,
    VCardActions,
    VCardTitle,
    VDivider,
    VFadeTransition,
} from 'vuetify'
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"
import { 
    faUpload, 
    faUserFriends, 
    faCodeBranch, 
    faGlobeAmericas,
    faInfoCircle,
    faCog,
    faGamepad
} from '@fortawesome/free-solid-svg-icons'

import { APP_VERSION } from '@/consts'
import { deviceIsCompatible } from '@/libraries/misc'
import checkOrTimes from '@/components/misc/checkOrTimes.vue'

const deviceStatus = ref(deviceIsCompatible())
</script>

<style scoped lang="scss">
.top-1\.25 {
    top: 0.32rem;
}
</style>
