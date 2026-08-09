<script setup>
defineProps({
  isVerified: { type: Boolean, default: true },
  badgeType: { type: String, default: 'trusted_lender' }, // 'verified_renter' | 'trusted_lender'
  size: { type: String, default: 'md' } // 'sm' | 'md' | 'lg'
})
</script>

<template>
  <span
    v-if="isVerified"
    class="inline-flex items-center gap-1 font-bold rounded-full border shadow-2xs transition-all shrink-0"
    :class="[
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]',
      badgeType === 'verified_renter'
        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    ]"
  >
    <svg class="w-3.5 h-3.5" :class="badgeType === 'verified_renter' ? 'text-sky-500' : 'text-emerald-500'" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    <span>{{ badgeType === 'verified_renter' ? 'Verified Renter' : 'Trusted Lender' }}</span>
  </span>
</template>
