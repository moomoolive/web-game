<template>
    <div class="fixed w-screen h-screen flex items-center justify-center text-xl sm:text-3xl">

        <div class="text-center">
            <div class="mb-5">
                <span class="mr-2">
                    <auto-save-icon/>
                </span>
                indicates <span class="text-green-500">auto-save</span> in progress
            </div>

            <div class="text-gray-400">
               Please <span class="text-red-500">don't</span> exit application
               <br/>
               while this icon is on screen
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import autoSaveIcon from '@/components/misc/autoSaveIcon.vue'
import { DEVICE_IS_COMPATIBLE_LOCALSTORAGE_KEY } from './DeviceCompatiblity.vue'

const router = useRouter()
const milliseconds = 5_000
function onNext() {
    const deviceCompatiblityTestPassed = window.localStorage.getItem(DEVICE_IS_COMPATIBLE_LOCALSTORAGE_KEY)
    if (!deviceCompatiblityTestPassed) {
        router.push("/device-compatiblity")
    } else {
        router.push("/main-menu")
    }
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
