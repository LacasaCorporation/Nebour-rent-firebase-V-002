<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../services/api'
import { listingFirstImage } from '../utils/imageUrl'
import { useFavoritesStore } from '../stores/favorites'

const router = useRouter()
const route = useRoute()
const favoritesStore = useFavoritesStore()

const searchQuery = ref((route.query.search as string) || '')
const selectedCategoryId = ref((route.query.category_id as string) || '')

const categories = ref<any[]>([])
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const showResultsDropdown = ref(false)
let debounceTimeout: any = null

onMounted(async () => {
  try {
    const res = await api.get('/categories')
    categories.value = res.data?.data || res.data || []
  } catch {
    categories.value = []
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => route.query,
  (q) => {
    searchQuery.value = (q.search as string) || ''
    selectedCategoryId.value = (q.category_id as string) || ''
  }
)

function handleInput() {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (!searchQuery.value.trim() && !selectedCategoryId.value) {
    searchResults.value = []
    showResultsDropdown.value = false
    return
  }

  debounceTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      const params: Record<string, any> = { limit: 5 }
      if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
      if (selectedCategoryId.value) params.category_id = selectedCategoryId.value

      const res = await api.get('/listings', { params })
      const list = res.data?.data || res.data || []
      searchResults.value = list
      showResultsDropdown.value = true
    } catch {
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 250)
}

function handleCategoryChange() {
  handleInput()
}

function submitSearch() {
  showResultsDropdown.value = false
  const query: Record<string, string> = {}
  if (searchQuery.value.trim()) query.search = searchQuery.value.trim()
  if (selectedCategoryId.value) query.category_id = selectedCategoryId.value

  router.push({ path: '/listings', query })
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  showResultsDropdown.value = false
  if (route.path === '/listings' && route.query.search) {
    const query = { ...route.query }
    delete query.search
    router.push({ path: '/listings', query })
  }
}

function selectListing(listingId: number) {
  showResultsDropdown.value = false
  router.push(`/listings/${listingId}`)
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.global-search-container')) {
    showResultsDropdown.value = false
  }
}

function statusBadge(status?: string) {
  const s = (status || 'available').toLowerCase()
  if (s === 'rented' || s === 'unavailable') {
    return { text: 'Rented', class: 'bg-amber-100 text-amber-800' }
  }
  if (s === 'maintenance' || s === 'repair') {
    return { text: 'Maintenance', class: 'bg-rose-100 text-rose-800' }
  }
  return { text: 'Available', class: 'bg-emerald-100 text-emerald-800' }
}
</script>

<template>
  <div class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-warm-200/80 px-4 py-2.5 sm:px-6">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">

      <!-- Left: Global Search Bar -->
      <div class="relative flex-1 max-w-2xl global-search-container">
        <form @submit.prevent="submitSearch" class="flex items-center bg-warm-100/80 hover:bg-warm-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500 border border-warm-200 rounded-2xl transition-all overflow-hidden shadow-2xs">

          <!-- Category Selector -->
          <div class="relative hidden sm:block shrink-0 border-r border-warm-200/80 bg-warm-50/50">
            <select
              v-model="selectedCategoryId"
              @change="handleCategoryChange"
              class="appearance-none pl-3.5 pr-8 py-2 text-xs font-semibold text-warm-700 bg-transparent cursor-pointer focus:outline-none"
            >
              <option value="">All Categories</option>
              <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
                {{ cat.name }}
              </option>
            </select>
            <svg class="w-3.5 h-3.5 text-warm-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <!-- Search Icon -->
          <div class="pl-3.5 text-warm-400 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>

          <!-- Input -->
          <input
            v-model="searchQuery"
            @input="handleInput"
            @focus="searchResults.length > 0 && (showResultsDropdown = true)"
            type="text"
            placeholder="Search items by name, category, brand..."
            class="w-full px-3 py-2 text-xs text-warm-900 placeholder:text-warm-400 bg-transparent focus:outline-none font-medium"
          />

          <!-- Loading or Clear Icon -->
          <div v-if="isSearching" class="pr-3 shrink-0">
            <div class="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <button
            v-else-if="searchQuery"
            type="button"
            @click="clearSearch"
            class="pr-3 text-warm-400 hover:text-warm-600 transition-colors shrink-0"
            title="Clear search"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Search submit button -->
          <button
            type="submit"
            class="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Search</span>
          </button>
        </form>

        <!-- Live Instant Results Dropdown -->
        <Transition name="fade">
          <div
            v-if="showResultsDropdown && searchResults.length > 0"
            class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-warm-200 overflow-hidden z-50 divide-y divide-warm-100"
          >
            <div class="px-4 py-2 bg-warm-50/80 flex items-center justify-between text-[11px] text-warm-500 font-semibold">
              <span>Rental Items</span>
              <span>{{ searchResults.length }} matches</span>
            </div>

            <div class="max-h-80 overflow-y-auto divide-y divide-warm-50">
              <div
                v-for="item in searchResults"
                :key="item.id"
                @click="selectListing(item.id)"
                class="p-2.5 hover:bg-brand-50/40 transition-colors cursor-pointer flex items-center gap-3 group"
              >
                <!-- Thumbnail -->
                <div class="w-11 h-11 rounded-lg overflow-hidden bg-warm-100 shrink-0 border border-warm-200/60">
                  <img
                    v-if="listingFirstImage(item)"
                    :src="listingFirstImage(item)"
                    :alt="item.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-warm-300 text-xs">📦</div>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h4 class="text-xs font-bold text-warm-900 group-hover:text-brand-600 truncate transition-colors">
                      {{ item.title }}
                    </h4>
                    <span :class="[statusBadge(item.status).class, 'text-[10px] font-bold px-2 py-0.2 rounded-full shrink-0']">
                      {{ statusBadge(item.status).text }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-warm-500 mt-0.5">
                    <span v-if="item.category?.name" class="font-medium text-warm-600">{{ item.category.name }}</span>
                    <span v-if="item.location">&middot; {{ item.location }}</span>
                  </div>
                </div>

                <!-- Price -->
                <div class="text-right shrink-0">
                  <span class="text-xs font-bold text-warm-900">${{ Number(item.daily_rate).toFixed(0) }}</span>
                  <span class="text-[10px] text-warm-400">/day</span>
                </div>
              </div>
            </div>

            <button
              @click="submitSearch"
              class="w-full py-2.5 bg-warm-50 hover:bg-brand-50 text-brand-600 hover:text-brand-700 text-xs font-bold text-center transition-colors block border-t border-warm-100 cursor-pointer"
            >
              See all results for "{{ searchQuery }}" &rarr;
            </button>
          </div>
        </Transition>
      </div>

      <!-- Right Action Items: Wishlist Counter -->
      <div class="flex items-center gap-3 shrink-0">
        <router-link
          to="/settings?tab=favorites"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warm-100/70 hover:bg-rose-50 hover:text-rose-600 text-warm-700 text-xs font-bold transition-all border border-warm-200/80 cursor-pointer group"
          title="View Saved Wishlist"
        >
          <svg
            :class="['w-4 h-4 transition-colors', favoritesStore.favoritedIds.value.size > 0 ? 'text-rose-500 fill-rose-500' : 'text-warm-500 group-hover:text-rose-500']"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          <span class="hidden md:inline">Wishlist</span>
          <span
            v-if="favoritesStore.favoritedIds.value.size > 0"
            class="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white font-extrabold rounded-full"
          >
            {{ favoritesStore.favoritedIds.value.size }}
          </span>
        </router-link>
      </div>

    </div>
  </div>
</template>
