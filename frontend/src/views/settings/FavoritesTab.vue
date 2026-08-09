<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { favoritesAPI } from '../../services/api'
import ListingCard from '../../components/ListingCard.vue'

const favorites = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await favoritesAPI.getAll()
    favorites.value = res.data?.data ?? res.data ?? []
  } catch {
    favorites.value = []
  } finally {
    loading.value = false
  }
}

async function removeFavorite(listingId: number) {
  try {
    await favoritesAPI.remove(listingId)
    favorites.value = favorites.value.filter((f: any) => f.id !== listingId && f.listing?.id !== listingId)
  } catch {
    //
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-warm-900 mb-1">Favorites</h3>
    <p class="text-sm text-warm-500 mb-6">Items you've saved for later.</p>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="favorites.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 text-warm-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
      <p class="text-warm-500 text-sm">No favorites yet.</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="fav in favorites" :key="fav.id" class="relative">
        <ListingCard
          :listing="fav.listing ?? fav"
          :is-favorited="true"
          @toggle-favorite="removeFavorite"
        />
      </div>
    </div>
  </div>
</template>
