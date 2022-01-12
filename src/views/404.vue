<template>
    <div class="fixed w-screen h-screen flex items-center justify-center">
        <div class="text-center">
            <div class="text-5xl text-cyan-500 mb-4">
                <font-awesome-icon :icon="['fas', 'frown-open']"/>
            </div>

            <div class="text-base sm:text-xl mb-4">
                Ooops...this page doesn't exist
            </div>

            <div>
                <v-btn color="surface" block large @click="$router.push('/main-menu')">
                    <span class="text-cyan-500 mr-2">
                        <font-awesome-icon :icon="['fas', 'arrow-left']"/>
                    </span>
                    Back to Menu
                </v-btn>
            </div>
        </div>
    </div>
</template>
