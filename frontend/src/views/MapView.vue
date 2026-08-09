<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NeighborhoodRentalMap from '../components/NeighborhoodRentalMap.vue'
import { listingsAPI } from '../services/api'

const listings = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await listingsAPI.getAll({ limit: 100 })
    const data = res.data
    listings.value = data?.data || data || []
  } catch (err) {
    console.error('Failed to load listings for map:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-warm-200/80 shadow-2xs">
      <div>
        <h1 class="text-2xl font-black text-warm-900 tracking-tight flex items-center gap-2">
          <span>🗺️ Neighborhood Rental Map</span>
        </h1>
        <p class="text-xs text-warm-500 font-medium mt-1">
          Locate available equipment, tools, vehicles, and items relative to your neighborhood or current GPS location.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <router-link
          to="/listings"
          class="px-4 py-2 rounded-2xl bg-warm-100 hover:bg-warm-200 text-warm-800 text-xs font-bold transition-all"
        >
          &larr; Back to Grid View
        </router-link>
      </div>
    </div>

    <!-- Map Container -->
    <div v-if="loading" class="w-full h-96 bg-white rounded-3xl border border-warm-200 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs font-semibold text-warm-500">Loading rental locations map...</p>
      </div>
    </div>

    <NeighborhoodRentalMap v-else :listings="listings" />
  </div>
</template>
