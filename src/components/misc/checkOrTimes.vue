<template>
    <font-awesome-icon 
        v-if="props.check" 
        class="text-green-500" 
        :icon="faCheck" 
    />
    
    <font-awesome-icon 
        v-else 
        class="text-red-500" 
        :icon="faTimes" 
    />
</template>

<script lang="ts">
export default {
    name: "checkOrTimes"
}
</script>

<script setup lang="ts">
import { defineProps } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({ check: { type: Boolean, required: true } })
</script>