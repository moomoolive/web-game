<template>
    <div class="fixed w-screen h-screen flex items-center justify-center">
        <div class="text-center">
            <div class="text-5xl text-secondary-color mb-4">
                <font-awesome-icon :icon="faFrownOpen"/>
            </div>

            <div class="text-base sm:text-xl mb-4">
                Ooops...this page doesn't exist
            </div>

            <div>
                <v-btn color="surface" block large @click="$router.push('/main-menu')">
                    <span class="text-secondary-color mr-2">
                        <font-awesome-icon :icon="faArrowLeft"/>
                    </span>
                    Back to Menu
                </v-btn>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faFrownOpen, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { VBtn } from 'vuetify'
</script>
