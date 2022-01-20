<template>
  <!-- 
    router transition taken from:
    https://learnvue.co/2021/01/4-awesome-examples-of-vue-router-transitions/#-1-fade-vue-router-transitions
  -->
  <router-view v-slot="{ Component }" class="text-gray-100 z-0">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <v-fade-transition>
    <div 
      class="fixed w-screen h-screen z-50 flex items-center justify-center bg-overlay-0.5"
      v-show="$store.state.confirm.show"  
    >
      <div class="w-5/6 max-w-screen-sm min-w-250">
        <v-card elevation="2">
          <v-card-title 
            v-if="$store.state.confirm.header.length > 0" 
            class="text-h5"
          >
            {{ $store.state.confirm.header }}
          </v-card-title>

          <span v-if="$store.state.confirm.body.length > 0">
            <v-card-text>
              {{ $store.state.confirm.body }}
            </v-card-text>

            <v-divider></v-divider>
          </span>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn 
              color="primary" 
              text 
              @click="confirm.resolveModal(true)"
            >
              Okay
            </v-btn>
            
            <v-btn 
              color="primary" 
              text
              @click="confirm.resolveModal(false)"
            >
              Cancel
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </div>
  </v-fade-transition>

</template>

<script setup lang="ts">
import { useActions } from '@/store/lib'
import { 
  VCard, 
  VCardActions, 
  VBtn, 
  VFadeTransition, 
  VCardText, 
  VCardTitle,
  VSpacer,
  VDivider
} from 'vuetify'

const { confirm } = useActions()
</script>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}


.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.min-w-250 {
  min-width: 250px;
}
</style>
