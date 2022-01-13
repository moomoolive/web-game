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
import { useRouter } from 'vue-router'

const router = useRouter()
const milliseconds = 2_000
window.setTimeout(() => router.push("/tech-used"), milliseconds)
</script>

<style scoped lang="scss">

</style>
