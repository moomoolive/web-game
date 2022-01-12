<template>
  <div>
    hello world {{ vars }}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const vars = ref("my var")
</script>

<style scoped lang="scss">

</style>
