<script setup lang="ts">
import { useGlobalLoading } from '../composables/useGlobalLoading'

const { isGlobalLoading } = useGlobalLoading()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-[-8px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[-8px]"
    >
      <div v-if="isGlobalLoading" class="fixed inset-0 pointer-events-none z-[99999] flex flex-col justify-between">
        
        <!-- Top Animated Progress Line -->
        <div class="w-full h-1 bg-gradient-to-r from-amber-500 via-brand-500 to-yellow-400 animate-pulse shadow-sm shadow-amber-500/50">
          <div class="h-full bg-white/60 w-1/3 animate-ping"></div>
        </div>

        <!-- Floating Badge Indicator at Top Right -->
        <div class="absolute top-4 right-4 sm:top-6 sm:right-6">
          <div class="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md">
            <!-- Custom Dual Ring Spinner -->
            <div class="relative w-4 h-4 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full border-2 border-amber-400/30"></div>
              <div class="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></div>
            </div>
            
            <span class="text-xs font-bold tracking-wide text-slate-100">
              Updating data...
            </span>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>
