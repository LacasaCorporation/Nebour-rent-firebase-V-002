<script setup>
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-radius-md shadow-lg border backdrop-blur-sm
                 animate-slide-in"
          :class="{
            'bg-success-bg border-success/20 text-warm-800': toast.type === 'success',
            'bg-danger-bg border-danger/20 text-warm-800': toast.type === 'error',
            'bg-warning-bg border-warning/20 text-warm-800': toast.type === 'warning',
            'bg-white border-warm-200 text-warm-800': toast.type === 'info',
          }"
        >
          <span class="mt-0.5 shrink-0 text-lg leading-none">
            <template v-if="toast.type === 'success'">&#10003;</template>
            <template v-else-if="toast.type === 'error'">&#10007;</template>
            <template v-else-if="toast.type === 'warning'">&#9888;</template>
            <template v-else>&#8505;</template>
          </span>
          <p class="flex-1 text-sm font-medium leading-tight">{{ toast.message }}</p>
          <button
            @click="dismiss(toast.id)"
            class="shrink-0 text-warm-400 hover:text-warm-600 transition-colors leading-none text-lg"
          >&times;</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-slide-in {
  animation: slideIn 0.25s ease-out;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
.toast-enter-active { transition: all 0.25s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to { opacity: 0; transform: translateX(40px); }
</style>
