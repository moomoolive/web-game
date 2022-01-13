<template>
    <div class="fixed w-screen h-screen flex items-center justify-center text-xl sm:text-3xl">

        <div>
            <div v-if="!allChecksFinished" class="animate-pulse">
                <span class="mr-2 text-primary-color">
                    <loading-spinner/>
                </span>
                Checking device compatiblity
            </div>
            <div v-else>
                <div v-if="deviceIsCompatible">
                    <span class="mr-2 text-green-500">
                        <font-awesome-icon :icon="['fas', 'thumbs-up']" />
                    </span>
                    You're good to go
                </div>

                <div v-else>
                    <div>
                        <span class="mr-2 text-yellow-500">
                            <font-awesome-icon :icon="['fas', 'exclamation-triangle']" />
                        </span>
                        <span class="text-yellow-500">
                            Your device is incompatible
                        </span>
                    </div>

                    <div class="text-gray-200 text-sm sm:text-base">
                        Try updating your browser to the latest version
                    </div>
                </div>
            </div>

            <v-fade-transition>
                <div 
                    v-show="allChecksFinished"
                    class="text-base sm:text-lg ml-1 sm:ml-2 mt-4 text-gray-400"
                >
                    <div>
                        <check-or-times class="mr-2" :check="webAssembly" />
                        Web Assembly supported
                    </div>

                    <div>
                        <check-or-times class="mr-2" :check="threading" />
                        Worker threading supported
                    </div>

                    <div>
                        <check-or-times class="mr-2" :check="cores" />
                        Device has multiple cores
                    </div>

                    <div>
                        <check-or-times class="mr-2" :check="webGL" />
                        WebGL supported
                    </div>
                </div>
            </v-fade-transition>
        </div>

    </div>
</template>

<script lang="ts">
export const DEVICE_IS_COMPATIBLE_LOCALSTORAGE_KEY = "device-is-compatible"
</script>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'

import loadingSpinner from '@/components/misc/loadingSpinner.vue'
import { 
    webAssemblyIsSupported,
    threadingIsSupported,
    deviceHasMultipleCores,
    webGLIsSupported,
    sleepSeconds
} from '@/libraries/misc'
import checkOrTimes from '@/components/misc/checkOrTimes.vue'

const router = useRouter()
const allChecksFinished = ref(false)
const webAssembly = ref(false)
const threading = ref(false)
const cores = ref(false)
const webGL = ref(false)
const deviceIsCompatible = ref(false)

const milliseconds = 3_500
window.setTimeout(async () => {
    webAssembly.value = webAssemblyIsSupported()
    threading.value = threadingIsSupported()
    cores.value = deviceHasMultipleCores()
    webGL.value = webGLIsSupported()
    
    const compiledChecks = [webAssembly.value, threading.value, cores.value, webGL.value]
    deviceIsCompatible.value = compiledChecks.reduce((total, compatible) => total || compatible)
    allChecksFinished.value = true
    window.localStorage.setItem(DEVICE_IS_COMPATIBLE_LOCALSTORAGE_KEY, JSON.stringify(true))
    
    await sleepSeconds(3)
    router.push("/main-menu")
}, milliseconds)

</script>

<style scoped lang="scss">
</style>
