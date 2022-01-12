<template>
  <!-- 
    router transition taken from:
    https://learnvue.co/2021/01/4-awesome-examples-of-vue-router-transitions/#-1-fade-vue-router-transitions
  -->
  <router-view v-slot="{ Component }" class="text-gray-100">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}


.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
