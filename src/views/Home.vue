<template>
  <div class="fixed w-screen h-screen flex items-center justify-center text-2xl sm:text-3xl">
    
    <v-fade-transition>
      <div v-show="showBrand">
          <span class="text-purple-500 mr-2">
            <font-awesome-icon class="animate-spin" :icon="['fas', 'gamepad']"/>
          </span>
          Web Games
      </div>
    </v-fade-transition>

    <v-fade-transition>
      <div v-show="showSecondScreen">
          Made with
          <span class="ml-2">
            [
          </span>
          <span class="text-yellow-500">
            <font-awesome-icon class="animate-pulse" :icon="['fab', 'js']"/>
          </span>
          ,
          <span class="text-blue-500 ml-2">
            <font-awesome-icon class="animate-pulse" :icon="['fab', 'css3']"/>
          </span>
          ,
          <span class="text-red-500 ml-2">
            <font-awesome-icon class="animate-pulse" :icon="['fab', 'html5']"/>
          </span>
          ]
      </div>
    </v-fade-transition>

  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showBrand = ref(false)
const showSecondScreen = ref(false)

window.setTimeout(() => showBrand.value = true, 300)

watchEffect(() => {
  if (!showBrand.value) {
    return
  } 
  window.setTimeout(() => showBrand.value = false, 3_000)
  window.setTimeout(() => showSecondScreen.value = true, 3_500)
  window.setTimeout(() => router.push("/main-menu"), 6_500)
})
</script>

<style scoped lang="scss">

</style>
