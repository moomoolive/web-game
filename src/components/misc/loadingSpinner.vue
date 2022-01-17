<template>
    <font-awesome-icon class="animate-spin" :icon="faSpinner"/>
</template>

<script lang="ts">
export default {
    name: "loadingSpinner"
}
</script>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
</script>