<template>
    <font-awesome-icon v-if="props.check" class="text-green-500" :icon="['fas', 'check']" />
    <font-awesome-icon v-else class="text-red-500" :icon="['fas', 'times']" />
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({ check: { type: Boolean, required: true } })
</script>