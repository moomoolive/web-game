<template>
    <font-awesome-icon 
        class="animate-pulse text-green-500" 
        :icon="faSave"
    />
</template>

<script lang="ts">
export default {
    name: "autoSaveIcon"
}
</script>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSave } from '@fortawesome/free-solid-svg-icons'
</script>