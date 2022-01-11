<template>
  <div>
    hello world
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from '@vue/runtime-core'
import { key } from '@/store/index'
import { useStore } from 'vuex'

const count = ref(0)

const store = useStore(key)
const auth = computed(() => {
  return store.getters.getAuth
})
</script>

<style scoped lang="scss">

</style>
