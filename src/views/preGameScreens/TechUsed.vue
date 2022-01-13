<template>
    <div class="fixed w-screen h-screen flex items-center justify-center text-xl sm:text-3xl">

        <div>
            Made with
            <span class="ml-2">
            [
            </span>
            <span class="text-yellow-500">
                <font-awesome-icon class="animate-bounce" :icon="['fab', 'js']"/>
            </span>
            ,
            <span class="text-blue-500 ml-2">
                <font-awesome-icon class="animate-bounce" :icon="['fab', 'css3']"/>
            </span>
            ,
            <span class="text-red-500 ml-2">
                <font-awesome-icon class="animate-bounce" :icon="['fab', 'html5']"/>
            </span>
            ]
        </div>

    </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const milliseconds = 3_500
function onNext() {
  router.push("/auto-save-notice")
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
