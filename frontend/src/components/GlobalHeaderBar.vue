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
const maxDistanceKm = ref((route.query.max_distance_km as string) || '15')

// Location state
const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)
const locationName = ref('')
const isLocating = ref(false)
const locationStatus = ref<string>('')

const categories = ref<any[]>([])
const searchResults = ref<any[]>([])
const isSearching = ref(false)
const showResultsDropdown = ref(false)
let debounceTimeout: any = null

onMounted(async () => {
  // Restore saved location if any
  const savedLat = localStorage.getItem('user_lat')
  const savedLng = localStorage.getItem('user_lng')
  const savedName = localStorage.getItem('user_location_name')
  if (savedLat && savedLng) {
    userLat.value = parseFloat(savedLat)
    userLng.value = parseFloat(savedLng)
    locationName.value = savedName || `Near ${userLat.value.toFixed(2)}, ${userLng.value.toFixed(2)}`
  }

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
    if (q.max_distance_km) maxDistanceKm.value = q.max_distance_km as string
  }
)

async function locateUser() {
  isLocating.value = true
  locationStatus.value = 'Acquiring GPS location...'

  if (!navigator.geolocation) {
    fallbackLocation('Geolocation not supported by browser')
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLat.value = position.coords.latitude
      userLng.value = position.coords.longitude
      localStorage.setItem('user_lat', String(userLat.value))
      localStorage.setItem('user_lng', String(userLng.value))

      // Reverse geocode via Nominatim OSM
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat.value}&lon=${userLng.value}`
        )
        const geoData = await geoRes.json()
        const city = geoData.address?.city || geoData.address?.town || geoData.address?.suburb || geoData.address?.county
        const state = geoData.address?.state
        locationName.value = city ? `${city}${state ? ', ' + state : ''}` : `GPS (${userLat.value.toFixed(2)}, ${userLng.value.toFixed(2)})`
      } catch {
        locationName.value = `GPS (${userLat.value.toFixed(2)}, ${userLng.value.toFixed(2)})`
      }

      localStorage.setItem('user_location_name', locationName.value)
      locationStatus.value = ''
      isLocating.value = false

      // Fetch nearby listings immediately
      fetchNearbyListings()
    },
    (err) => {
      fallbackLocation(err.message || 'GPS location permission denied')
    },
    { timeout: 8000, enableHighAccuracy: true }
  )
}

function fallbackLocation(reason: string) {
  // Fallback to San Francisco default
  userLat.value = 37.7749
  userLng.value = -122.4194
  locationName.value = 'San Francisco, CA (Default)'
  localStorage.setItem('user_lat', String(userLat.value))
  localStorage.setItem('user_lng', String(userLng.value))
  localStorage.setItem('user_location_name', locationName.value)
  locationStatus.value = ''
  isLocating.value = false
  fetchNearbyListings()
}

function clearLocation() {
  userLat.value = null
  userLng.value = null
  locationName.value = ''
  localStorage.removeItem('user_lat')
  localStorage.removeItem('user_lng')
  localStorage.removeItem('user_location_name')
  fetchNearbyListings()
}

function handleInput() {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    fetchNearbyListings()
  }, 250)
}

async function fetchNearbyListings() {
  isSearching.value = true
  try {
    const params: Record<string, any> = { limit: 6 }
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    if (selectedCategoryId.value) params.category_id = selectedCategoryId.value

    if (userLat.value !== null && userLng.value !== null) {
      params.user_lat = userLat.value
      params.user_lng = userLng.value
      params.sort = 'distance'
      if (maxDistanceKm.value && maxDistanceKm.value !== 'all') {
        params.max_distance_km = maxDistanceKm.value
      }
    }

    const res = await api.get('/listings', { params })
    const list = res.data?.data || res.data || []
    searchResults.value = list
    showResultsDropdown.value = true
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

function submitSearch() {
  showResultsDropdown.value = false
  const query: Record<string, string> = {}
  if (searchQuery.value.trim()) query.search = searchQuery.value.trim()
  if (selectedCategoryId.value) query.category_id = selectedCategoryId.value

  if (userLat.value !== null && userLng.value !== null) {
    query.user_lat = String(userLat.value)
    query.user_lng = String(userLng.value)
    query.sort = 'distance'
    if (maxDistanceKm.value && maxDistanceKm.value !== 'all') {
      query.max_distance_km = maxDistanceKm.value
    }
  }

  router.push({ path: '/listings', query })
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

      <!-- Nearby & GPS Search Bar Container -->
      <div class="relative flex-1 max-w-3xl global-search-container">
        <form @submit.prevent="submitSearch" class="flex flex-col sm:flex-row items-stretch sm:items-center bg-warm-100/90 hover:bg-warm-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500 border border-warm-200 rounded-2xl transition-all overflow-hidden shadow-2xs">

          <!-- Location Detection Badge / Trigger Button -->
          <div class="shrink-0 border-b sm:border-b-0 sm:border-r border-warm-200/80 bg-warm-50/70 p-1 flex items-center gap-1.5">
            <button
              type="button"
              @click="locateUser"
              :disabled="isLocating"
              class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Detect my GPS location to find nearest rental items"
            >
              <svg v-if="isLocating" class="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <svg v-else class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span class="whitespace-nowrap">{{ isLocating ? 'Locating...' : (userLat ? '📍 ' + locationName : '📍 Locate Me') }}</span>
            </button>

            <!-- Clear location button if active -->
            <button
              v-if="userLat !== null"
              type="button"
              @click="clearLocation"
              class="p-1 text-warm-400 hover:text-rose-600 transition-colors"
              title="Reset location filter"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- Search Radius Filter (when location detected) -->
            <select
              v-if="userLat !== null"
              v-model="maxDistanceKm"
              @change="handleInput"
              class="appearance-none px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer focus:outline-none hidden md:block"
            >
              <option value="5">Within 5 km</option>
              <option value="15">Within 15 km</option>
              <option value="30">Within 30 km</option>
              <option value="50">Within 50 km</option>
              <option value="all">Any distance</option>
            </select>
          </div>

          <!-- Text Input for Searching Nearest Items -->
          <div class="flex-1 flex items-center min-w-0 px-2 py-1">
            <svg class="w-4 h-4 text-warm-400 ml-1 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              v-model="searchQuery"
              @input="handleInput"
              @focus="searchResults.length > 0 && (showResultsDropdown = true)"
              type="text"
              :placeholder="userLat ? 'Search nearest items around ' + locationName + '...' : 'Locate position or search items by name, category...'"
              class="w-full px-2 py-1 text-xs text-warm-900 placeholder:text-warm-400 bg-transparent focus:outline-none font-medium"
            />
            
            <div v-if="isSearching" class="pr-2 shrink-0">
              <div class="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>

          <!-- Submit CTA Button -->
          <button
            type="submit"
            class="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span class="whitespace-nowrap">{{ userLat ? 'Find Nearest' : 'Search Nearby' }}</span>
          </button>
        </form>

        <!-- Live Instant Results Dropdown -->
        <Transition name="fade">
          <div
            v-if="showResultsDropdown && searchResults.length > 0"
            class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-warm-200 overflow-hidden z-50 divide-y divide-warm-100"
          >
            <div class="px-4 py-2 bg-warm-50/80 flex items-center justify-between text-[11px] text-warm-600 font-semibold">
              <span class="flex items-center gap-1.5">
                <span class="text-brand-600 font-bold">📍 Nearest Items Found</span>
                <span v-if="userLat" class="text-emerald-700 font-bold">({{ locationName }})</span>
              </span>
              <span>{{ searchResults.length }} matches</span>
            </div>

            <div class="max-h-80 overflow-y-auto divide-y divide-warm-50">
              <div
                v-for="item in searchResults.filter(Boolean)"
                :key="item.id"
                @click="item.id && selectListing(item.id)"
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
                    <span v-if="item.distance_km !== null && item.distance_km !== undefined" class="text-brand-600 font-bold bg-brand-50 px-1.5 py-0.2 rounded-md border border-brand-200/60 ml-auto">
                      📍 {{ item.distance_km }} km away
                    </span>
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
              See all nearest results on map & list &rarr;
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
