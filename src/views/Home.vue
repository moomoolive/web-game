<template>
  <div class="fixed w-screen h-screen flex items-center justify-center text-2xl sm:text-3xl">
    
    <div>
        <span class="text-primary-color mr-2">
          <font-awesome-icon class="animate-spin" :icon="['fas', 'gamepad']"/>
        </span>
        Web Games
    </div>

  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const milliseconds = 2_000
function onNext() {
  router.push("/tech-used")
}
const timeoutId = window.setTimeout(onNext, milliseconds)
window.addEventListener('keydown', onNext)
window.addEventListener('mousedown', onNext)
onUnmounted(() => {
    window.clearTimeout(timeoutId)
    window.removeEventListener('keydown', onNext)
    window.removeEventListener('mousedown', onNext)
})
</script>

<style scoped lang="scss">

</style>
