<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>

<template>
  <div class="contents">
    <div
      v-for="n in (count || 1)"
      :key="n"
      class="bg-white rounded-xl border border-warm-200/80 overflow-hidden shadow-xs flex flex-col justify-between animate-pulse select-none pointer-events-none"
    >
      <div>
        <!-- Image & Floating Badge Placeholders -->
        <div class="relative aspect-[4/3] bg-warm-200/70 overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
          
          <!-- Top Badges -->
          <div class="absolute top-3 left-3 flex gap-2">
            <div class="h-5 w-16 bg-warm-300/80 rounded-full"></div>
            <div class="h-5 w-20 bg-warm-300/60 rounded-full"></div>
          </div>

          <!-- Top Right Action Buttons -->
          <div class="absolute top-3 right-3 flex gap-1.5">
            <div class="w-7 h-7 bg-white/80 rounded-full"></div>
            <div class="w-7 h-7 bg-white/80 rounded-full"></div>
          </div>

          <!-- Bottom Price Badge -->
          <div class="absolute bottom-3 right-3 h-7 w-20 bg-warm-300/90 rounded-xl"></div>
        </div>

        <!-- Card Body Content -->
        <div class="p-4 space-y-3">
          <!-- Rating & Location row -->
          <div class="flex items-center justify-between">
            <div class="h-3.5 w-20 bg-warm-200 rounded-md"></div>
            <div class="h-3.5 w-16 bg-warm-200 rounded-md"></div>
          </div>

          <!-- Title -->
          <div class="space-y-1.5 pt-1">
            <div class="h-4 bg-warm-300/80 rounded-md w-11/12"></div>
            <div class="h-4 bg-warm-200 rounded-md w-3/4"></div>
          </div>

          <!-- Owner / Lender Row -->
          <div class="pt-2 flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-warm-200 shrink-0"></div>
            <div class="space-y-1 flex-1">
              <div class="h-3 bg-warm-200 rounded w-1/2"></div>
              <div class="h-2.5 bg-warm-100 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="px-4 pb-4 pt-2 border-t border-warm-100/80 flex items-center justify-between gap-2">
        <div class="h-8 bg-warm-100 rounded-xl w-2/5"></div>
        <div class="h-8 bg-warm-300/80 rounded-xl w-2/5"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
