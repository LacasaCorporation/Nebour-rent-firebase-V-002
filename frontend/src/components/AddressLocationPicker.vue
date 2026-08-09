<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  address?: string
  location?: string
  lat?: number | null
  lng?: number | null
}>()

const emit = defineEmits<{
  'update:address': [value: string]
  'update:location': [value: string]
  'update:lat': [value: number | null]
  'update:lng': [value: number | null]
}>()

const searchQuery = ref(props.address || '')
const searchSuggestions = ref<any[]>([])
const isSearching = ref(false)
const showSuggestions = ref(false)
const isLocatingGPS = ref(false)
const mapContainer = ref<HTMLElement | null>(null)

let leafletMap: any = null
let draggableMarker: any = null
let searchDebounceTimer: any = null

// Current active coordinates (default to NYC Brooklyn if empty)
const currentLat = ref<number>(props.lat || 40.6782)
const currentLng = ref<number>(props.lng || -73.9442)
const hasCustomCoords = ref<boolean>(!!(props.lat && props.lng))

watch(() => props.address, (newVal) => {
  if (newVal !== undefined && !isSearching.value) {
    searchQuery.value = newVal
  }
})

onMounted(() => {
  loadLeafletAndInitMap()
})

onUnmounted(() => {
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
})

function loadLeafletAndInitMap() {
  if ((window as any).L) {
    initLeafletMap()
    return
  }

  // Inject Leaflet CSS if not loaded
  if (!document.getElementById('leaflet-css-picker')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css-picker'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }

  // Inject Leaflet JS if not loaded
  if (!(window as any).L) {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      initLeafletMap()
    }
    document.head.appendChild(script)
  }
}

function initLeafletMap() {
  if (!mapContainer.value) return
  const L = (window as any).L
  if (!L) return

  if (leafletMap) {
    leafletMap.remove()
  }

  const initialZoom = hasCustomCoords.value ? 15 : 12

  leafletMap = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: false
  }).setView([currentLat.value, currentLng.value], initialZoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(leafletMap)

  // Custom Draggable Pin Icon
  const pinIcon = L.divIcon({
    className: 'custom-picker-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-10 h-10 rounded-full bg-brand-600 text-white shadow-xl border-2 border-white flex items-center justify-center font-bold text-lg animate-bounce">
          📍
        </div>
        <div class="absolute -bottom-1 w-3 h-1.5 bg-black/30 rounded-full blur-2xs"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 38]
  })

  draggableMarker = L.marker([currentLat.value, currentLng.value], {
    icon: pinIcon,
    draggable: true
  }).addTo(leafletMap)

  // On marker drag end, update lat/lng and reverse geocode
  draggableMarker.on('dragend', (e: any) => {
    const pos = e.target.getLatLng()
    updateLocationCoords(pos.lat, pos.lng, true)
  })

  // On map click, move marker to clicked spot
  leafletMap.on('click', (e: any) => {
    draggableMarker.setLatLng(e.latlng)
    updateLocationCoords(e.latlng.lat, e.latlng.lng, true)
  })
}

// Search address using Nominatim Geocoding API
function onSearchInput() {
  emit('update:address', searchQuery.value)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  
  if (!searchQuery.value || searchQuery.value.trim().length < 3) {
    searchSuggestions.value = []
    showSuggestions.value = false
    return
  }

  searchDebounceTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      const query = encodeURIComponent(searchQuery.value)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      })
      if (res.ok) {
        const data = await res.json()
        searchSuggestions.value = data || []
        showSuggestions.value = data.length > 0
      }
    } catch (e) {
      console.warn('Geocoding search failed:', e)
    } finally {
      isSearching.value = false
    }
  }, 400)
}

function selectSuggestion(item: any) {
  showSuggestions.value = false
  const fullAddress = item.display_name
  searchQuery.value = fullAddress
  emit('update:address', fullAddress)

  // Extract neighborhood/city string for 'location' field
  const addr = item.address || {}
  const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state || ''
  const neighborhood = addr.neighbourhood || addr.suburb || city
  const locString = neighborhood && city && neighborhood !== city ? `${neighborhood}, ${city}` : (city || fullAddress.split(',')[0])

  emit('update:location', locString)

  const latNum = parseFloat(item.lat)
  const lngNum = parseFloat(item.lon)
  updateLocationCoords(latNum, lngNum, false)
}

// Update coordinates and optionally reverse-geocode address
async function updateLocationCoords(lat: number, lng: number, shouldReverseGeocode = false) {
  currentLat.value = lat
  currentLng.value = lng
  hasCustomCoords.value = true

  emit('update:lat', lat)
  emit('update:lng', lng)

  if (leafletMap && draggableMarker) {
    leafletMap.panTo([lat, lng])
    draggableMarker.setLatLng([lat, lng])
  }

  if (shouldReverseGeocode) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.display_name) {
          const fullAddress = data.display_name
          searchQuery.value = fullAddress
          emit('update:address', fullAddress)

          const addr = data.address || {}
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || ''
          const neighborhood = addr.neighbourhood || addr.suburb || city
          const locString = neighborhood && city && neighborhood !== city ? `${neighborhood}, ${city}` : (city || fullAddress.split(',')[0])
          emit('update:location', locString)
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e)
    }
  }
}

function locateUserGPS() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser')
    return
  }
  isLocatingGPS.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      isLocatingGPS.value = false
      updateLocationCoords(pos.coords.latitude, pos.coords.longitude, true)
      if (leafletMap) leafletMap.setZoom(16)
    },
    (err) => {
      isLocatingGPS.value = false
      console.warn('GPS location error:', err)
      alert('Unable to acquire GPS location. Please type your street address or click on the map.')
    },
    { timeout: 8000 }
  )
}
</script>

<template>
  <div class="space-y-3">
    <!-- Header Label & GPS Trigger -->
    <div class="flex items-center justify-between">
      <label class="block text-sm font-semibold text-warm-900 flex items-center gap-1.5">
        <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <span>Street Address & Pin Location</span>
      </label>

      <button
        type="button"
        @click="locateUserGPS"
        :disabled="isLocatingGPS"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl border border-brand-200 transition-all cursor-pointer disabled:opacity-50"
      >
        <svg class="w-3.5 h-3.5 animate-pulse" :class="{ 'animate-spin': isLocatingGPS }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25v2.25m0 15v2.25m9.75-9.75h-2.25M4.5 12H2.25" />
        </svg>
        <span>{{ isLocatingGPS ? 'Acquiring GPS...' : '📍 Use My Current Location' }}</span>
      </button>
    </div>

    <!-- Address Autocomplete Input & Suggestions Dropdown -->
    <div class="relative">
      <div class="relative flex items-center">
        <input
          v-model="searchQuery"
          @input="onSearchInput"
          @focus="showSuggestions = searchSuggestions.length > 0"
          type="text"
          placeholder="Type street address, neighborhood, city or postal code..."
          class="w-full pl-10 pr-10 py-3 rounded-xl border border-warm-200 bg-white text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all shadow-2xs"
        />

        <svg class="w-5 h-5 text-warm-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>

        <div v-if="isSearching" class="absolute right-3">
          <div class="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>

      <!-- Suggestions Dropdown -->
      <div
        v-if="showSuggestions && searchSuggestions.length > 0"
        class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-warm-200/90 overflow-hidden divide-y divide-warm-100 max-h-60 overflow-y-auto"
      >
        <button
          v-for="(item, idx) in searchSuggestions"
          :key="idx"
          type="button"
          @click="selectSuggestion(item)"
          class="w-full text-left px-4 py-2.5 hover:bg-brand-50/70 transition-colors flex items-start gap-2.5 text-xs text-warm-800"
        >
          <span class="text-brand-600 mt-0.5 text-sm shrink-0">📍</span>
          <div class="min-w-0 flex-1">
            <p class="font-bold text-warm-900 truncate">{{ item.display_name.split(',')[0] }}</p>
            <p class="text-[11px] text-warm-500 truncate">{{ item.display_name }}</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Interactive Location Pin Map -->
    <div class="rounded-2xl border border-warm-200/90 overflow-hidden bg-warm-100 relative">
      <div class="p-2 bg-warm-50/90 border-b border-warm-200/70 flex items-center justify-between text-xs font-medium text-warm-700">
        <span class="flex items-center gap-1">
          <span>👇 Drag pin or click map to adjust exact spot</span>
        </span>
        <span v-if="hasCustomCoords" class="text-[11px] font-mono text-warm-500 bg-white px-2 py-0.5 rounded-md border border-warm-200">
          {{ currentLat.toFixed(4) }}, {{ currentLng.toFixed(4) }}
        </span>
      </div>

      <div ref="mapContainer" class="w-full h-48 z-10"></div>
    </div>
  </div>
</template>

<style>
.custom-picker-pin {
  background: transparent !important;
  border: none !important;
}
</style>
