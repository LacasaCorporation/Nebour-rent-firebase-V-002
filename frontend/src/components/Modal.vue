<script setup>
defineProps({
  show: Boolean,
  title: { type: String, default: '' },
  maxWidth: { type: String, default: 'max-w-md' },
})
const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />
        <div
          class="relative bg-white rounded-2xl shadow-xl w-full overflow-hidden"
          :class="maxWidth"
        >
          <div v-if="title" class="flex items-center justify-between px-6 pt-6 pb-0">
            <h3 class="text-lg font-semibold text-warm-900">{{ title }}</h3>
            <button
              @click="emit('close')"
              class="text-warm-400 hover:text-warm-600 transition-colors p-1"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active { transition: all 0.2s ease-out; }
.modal-leave-active { transition: all 0.15s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-enter-from > div:last-child { transform: scale(0.95); }
.modal-leave-to { opacity: 0; }
.modal-leave-to > div:last-child { transform: scale(0.95); }
</style>
