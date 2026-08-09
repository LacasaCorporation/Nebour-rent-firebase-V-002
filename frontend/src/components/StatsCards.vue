<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../services/api'

defineProps({
  small: { type: Boolean, default: true }
})

const cards = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get('/stats')
    const data = res.data

    cards.value = [
      { label: 'Categories', value: data.total_categories ?? '—', icon: '📁', bg: 'bg-blue-50 text-blue-700 border-blue-200/80' },
      { label: 'Listings', value: data.total_listings ?? '—', icon: '📦', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
      { label: 'Available now', value: data.available_listings ?? '—', icon: '✅', bg: 'bg-amber-50 text-amber-700 border-amber-200/80' },
      { label: 'Rentals', value: data.total_rentals ?? '—', icon: '🤝', bg: 'bg-purple-50 text-purple-700 border-purple-200/80' },
      { label: 'Avg. Rating', value: data.avg_rating > 0 ? Number(data.avg_rating).toFixed(1) : '—', icon: '⭐', bg: 'bg-rose-50 text-rose-700 border-rose-200/80' },
    ]
  } catch (e) {
    console.error('Failed to load stats:', e)
    cards.value = [
      { label: 'Categories', value: '—', icon: '📁', bg: 'bg-blue-50 text-blue-700 border-blue-200/80' },
      { label: 'Listings', value: '—', icon: '📦', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
      { label: 'Available now', value: '—', icon: '✅', bg: 'bg-amber-50 text-amber-700 border-amber-200/80' },
      { label: 'Rentals', value: '—', icon: '🤝', bg: 'bg-purple-50 text-purple-700 border-purple-200/80' },
      { label: 'Avg. Rating', value: '—', icon: '⭐', bg: 'bg-rose-50 text-rose-700 border-rose-200/80' },
    ]
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full">
    <div
      v-for="card in cards"
      :key="card.label"
      class="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl border bg-white/95 backdrop-blur-xs shadow-2xs hover:shadow-xs transition-all duration-150 overflow-hidden"
      :class="card.bg.split(' ')[2]"
    >
      <!-- Mini icon badge -->
      <div class="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0" :class="card.bg.split(' ').slice(0, 2).join(' ')">
        <span>{{ card.icon }}</span>
      </div>

      <!-- Compact value and label -->
      <div class="min-w-0 flex-1 leading-none">
        <div class="flex items-baseline gap-1">
          <span v-if="loading" class="inline-block w-5 h-3 bg-warm-200 rounded animate-pulse"></span>
          <span v-else class="text-xs sm:text-sm font-extrabold text-warm-900 tracking-tight">
            {{ card.value }}
          </span>
        </div>
        <p class="text-[10px] font-medium text-warm-500 truncate mt-0.5">
          {{ card.label }}
        </p>
      </div>
    </div>
  </div>
</template>

