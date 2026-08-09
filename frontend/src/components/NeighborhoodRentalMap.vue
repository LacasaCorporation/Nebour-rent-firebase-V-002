<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listingFirstImage } from '../utils/imageUrl'
import { useFavoritesStore } from '../stores/favorites'

const router = useRouter()
const favoritesStore = useFavoritesStore()

const props = defineProps<{
  listings: any[]
  compact?: boolean
}>()

// Default neighborhood coordinates (NYC Metro Area defaults)
const NEIGHBORHOODS = [
  { id: 'brooklyn-park-slope', name: 'Park Slope, Brooklyn', lat: 40.6711, lng: -73.9814 },
  { id: 'brooklyn-williamsburg', name: 'Williamsburg, Brooklyn', lat: 40.7081, lng: -73.9571 },
  { id: 'brooklyn-dumbo', name: 'DUMBO / Downtown Brooklyn', lat: 40.7033, lng: -73.9881 },
  { id: 'manhattan-greenwich', name: 'Greenwich Village, Manhattan', lat: 40.7336, lng: -73.9997 },
  { id: 'manhattan-midtown', name: 'Midtown, Manhattan', lat: 40.7549, lng: -73.9840 },
  { id: 'queens-astoria', name: 'Astoria, Queens', lat: 40.7644, lng: -73.9235 },
  { id: 'queens-lic', name: 'Long Island City, Queens', lat: 40.7447, lng: -73.9485 },
  { id: 'custom-address', name: '📍 Custom Address / Search Spot', lat: 0, lng: 0 },
  { id: 'custom-gps', name: '📡 Use My GPS Location', lat: 0, lng: 0 }
]

const selectedNeighborhoodId = ref('brooklyn-park-slope')
const maxRadiusMiles = ref(10) // 1, 3, 5, 10, 25, 50 miles
const statusFilter = ref('all') // all, available, rented, maintenance
const selectedListing = ref<any | null>(null)
const userCoords = ref({ lat: 40.6711, lng: -73.9814 })
const isLocatingUser = ref(false)
const activeTab = ref<'map' | 'list'>('map')

const addressSearchQuery = ref('')
const addressSuggestions = ref<any[]>([])
const isSearchingAddress = ref(false)
const showAddressSuggestions = ref(false)
const activeOriginAddress = ref('Park Slope, Brooklyn, NY')
let addressDebounceTimer: any = null

const mapContainer = ref<HTMLElement | null>(null)
let leafletMap: any = null
let leafletMarkers: any[] = []
let userCircleOverlay: any = null
let centerMarker: any = null

function onAddressSearchInput() {
  if (addressDebounceTimer) clearTimeout(addressDebounceTimer)
  if (!addressSearchQuery.value || addressSearchQuery.value.trim().length < 3) {
    addressSuggestions.value = []
    showAddressSuggestions.value = false
    return
  }

  addressDebounceTimer = setTimeout(async () => {
    isSearchingAddress.value = true
    try {
      const query = encodeURIComponent(addressSearchQuery.value.trim())
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      })
      if (res.ok) {
        const data = await res.json()
        addressSuggestions.value = data || []
        showAddressSuggestions.value = data.length > 0
      }
    } catch (e) {
      console.warn('Address geocoding error:', e)
    } finally {
      isSearchingAddress.value = false
    }
  }, 350)
}

function selectAddressSuggestion(item: any) {
  showAddressSuggestions.value = false
  const latNum = parseFloat(item.lat)
  const lngNum = parseFloat(item.lon)
  activeOriginAddress.value = item.display_name.split(',').slice(0, 3).join(',')
  addressSearchQuery.value = activeOriginAddress.value

  userCoords.value = { lat: latNum, lng: lngNum }
  selectedNeighborhoodId.value = 'custom-address'
  updateMapCenterAndRadius()
}

async function reverseGeocodeCoords(lat: number, lng: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' }
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.display_name) {
        activeOriginAddress.value = data.display_name.split(',').slice(0, 3).join(',')
        addressSearchQuery.value = activeOriginAddress.value
      }
    }
  } catch (e) {
    console.warn('Reverse geocode failed:', e)
  }
}

function openDirections(item: any) {
  const origin = `${userCoords.value.lat},${userCoords.value.lng}`
  const destination = item.coords ? `${item.coords.lat},${item.coords.lng}` : encodeURIComponent(item.address || item.location)
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
  window.open(url, '_blank')
}

// Coordinates assignment for listings without lat/lng
function getItemCoords(item: any) {
  if (item.lat && item.lng) {
    return { lat: Number(item.lat), lng: Number(item.lng) }
  }
  // Deterministic fallback offset based on item ID and location text
  const loc = (item.location || '').toLowerCase()
  let base = { lat: 40.6782, lng: -73.9442 } // Brooklyn default

  if (loc.includes('manhattan')) {
    base = { lat: 40.7589, lng: -73.9851 }
  } else if (loc.includes('queens')) {
    base = { lat: 40.7282, lng: -73.7949 }
  } else if (loc.includes('bronx')) {
    base = { lat: 40.8448, lng: -73.8648 }
  } else if (loc.includes('staten')) {
    base = { lat: 40.5795, lng: -74.1502 }
  }

  // Offset pseudo-randomly using ID
  const seed = (item.id || 1) * 0.013
  return {
    lat: base.lat + Math.sin(seed) * 0.025,
    lng: base.lng + Math.cos(seed) * 0.035
  }
}

// Calculate Haversine distance in miles
function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8 // Radius of Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// List of listings enriched with coordinates & calculated distance
const enrichedListings = computed(() => {
  return props.listings.map((item) => {
    const coords = getItemCoords(item)
    const dist = getDistanceMiles(userCoords.value.lat, userCoords.value.lng, coords.lat, coords.lng)
    return {
      ...item,
      coords,
      distanceMiles: dist
    }
  })
})

// Filtered listings based on radius & status
const filteredListings = computed(() => {
  return enrichedListings.value.filter((item) => {
    // Status check
    const status = (item.status || 'available').toLowerCase()
    if (statusFilter.value === 'available' && status !== 'available') return false
    if (statusFilter.value === 'rented' && status !== 'rented' && status !== 'unavailable') return false
    if (statusFilter.value === 'maintenance' && status !== 'maintenance' && status !== 'repair') return false

    // Radius check
    if (maxRadiusMiles.value < 50 && item.distanceMiles > maxRadiusMiles.value) return false

    return true
  }).sort((a, b) => a.distanceMiles - b.distanceMiles)
})

// Watch neighborhood selection
watch(selectedNeighborhoodId, (newVal) => {
  if (newVal === 'custom-gps') {
    locateUserGPS()
  } else {
    const n = NEIGHBORHOODS.find((item) => item.id === newVal)
    if (n) {
      userCoords.value = { lat: n.lat, lng: n.lng }
      updateMapCenterAndRadius()
    }
  }
})

watch([maxRadiusMiles, statusFilter, filteredListings], () => {
  updateMapCenterAndRadius()
  renderMapMarkers()
})

onMounted(() => {
  loadLeafletAndInitMap()
})

function locateUserGPS() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser')
    selectedNeighborhoodId.value = 'brooklyn-park-slope'
    return
  }
  isLocatingUser.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userCoords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      isLocatingUser.value = false
      updateMapCenterAndRadius()
    },
    (err) => {
      console.warn('GPS location error:', err)
      isLocatingUser.value = false
      alert('Unable to retrieve your location. Falling back to Park Slope, Brooklyn.')
      selectedNeighborhoodId.value = 'brooklyn-park-slope'
    },
    { timeout: 8000 }
  )
}

function loadLeafletAndInitMap() {
  if ((window as any).L) {
    initLeafletMap()
    return
  }

  // Load Leaflet CSS
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)

  // Load Leaflet JS
  const script = document.createElement('script')
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
  script.onload = () => {
    initLeafletMap()
  }
  document.head.appendChild(script)
}

function initLeafletMap() {
  if (!mapContainer.value) return
  const L = (window as any).L
  if (!L) return

  if (leafletMap) {
    leafletMap.remove()
  }

  leafletMap = L.map(mapContainer.value, {
    zoomControl: false
  }).setView([userCoords.value.lat, userCoords.value.lng], 12)

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(leafletMap)

  // Zoom control on top right
  L.control.zoom({ position: 'topright' }).addTo(leafletMap)

  // Map Click Handler to set new origin spot
  leafletMap.on('click', (e: any) => {
    // Check if click was on map canvas
    if (e.originalEvent && e.originalEvent.target.classList.contains('leaflet-container')) {
      userCoords.value = { lat: e.latlng.lat, lng: e.latlng.lng }
      selectedNeighborhoodId.value = 'custom-address'
      reverseGeocodeCoords(e.latlng.lat, e.latlng.lng)
      updateMapCenterAndRadius()
      renderMapMarkers()
    }
  })

  updateMapCenterAndRadius()
  renderMapMarkers()
}

function updateMapCenterAndRadius() {
  if (!leafletMap) return
  const L = (window as any).L
  if (!L) return

  leafletMap.panTo([userCoords.value.lat, userCoords.value.lng])

  if (userCircleOverlay) {
    userCircleOverlay.remove()
  }

  // Render neighborhood radius overlay circle
  if (maxRadiusMiles.value < 50) {
    const meters = maxRadiusMiles.value * 1609.34
    userCircleOverlay = L.circle([userCoords.value.lat, userCoords.value.lng], {
      color: '#0d9488',
      fillColor: '#14b8a6',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 6',
      radius: meters
    }).addTo(leafletMap)
  }
}

function renderMapMarkers() {
  if (!leafletMap) return
  const L = (window as any).L
  if (!L) return

  // Clear existing markers
  leafletMarkers.forEach((m) => m.remove())
  leafletMarkers = []

  // Add User Neighborhood Marker (Draggable Pin)
  const userIcon = L.divIcon({
    className: 'custom-user-pin',
    html: `<div class="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-xl border-2 border-white ring-4 ring-brand-500/20 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform">🏠</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })

  const userMarker = L.marker([userCoords.value.lat, userCoords.value.lng], {
    icon: userIcon,
    draggable: true
  })
    .bindPopup(`<div class="p-2 text-center font-bold text-xs text-warm-900">📍 Search Center Point<br/><span class="text-[10px] text-warm-500 font-normal">Drag pin or click map to move</span></div>`)
    .addTo(leafletMap)

  userMarker.on('dragend', (e: any) => {
    const newPos = e.target.getLatLng()
    userCoords.value = { lat: newPos.lat, lng: newPos.lng }
    selectedNeighborhoodId.value = 'custom-address'
    reverseGeocodeCoords(newPos.lat, newPos.lng)
    updateMapCenterAndRadius()
  })

  leafletMarkers.push(userMarker)

  // Add Item Markers
  filteredListings.value.forEach((item) => {
    const status = (item.status || 'available').toLowerCase()
    let bgClass = 'bg-emerald-500'
    let textClass = 'text-white'
    let statusLabel = 'Available'

    if (status === 'rented' || status === 'unavailable') {
      bgClass = 'bg-amber-500'
      statusLabel = 'Rented'
    } else if (status === 'maintenance' || status === 'repair') {
      bgClass = 'bg-rose-500'
      statusLabel = 'Maintenance'
    }

    const priceText = `$${Number(item.daily_rate).toFixed(0)}`

    const itemIcon = L.divIcon({
      className: 'custom-item-pin',
      html: `
        <div class="px-2 py-1 rounded-full ${bgClass} ${textClass} font-bold text-[11px] shadow-md border-2 border-white flex items-center gap-1 transform hover:scale-110 transition-transform cursor-pointer">
          <span>${priceText}</span>
        </div>
      `,
      iconSize: [50, 26],
      iconAnchor: [25, 13]
    })

    const marker = L.marker([item.coords.lat, item.coords.lng], { icon: itemIcon }).addTo(leafletMap)

    marker.on('click', () => {
      selectedListing.value = item
      leafletMap.panTo([item.coords.lat, item.coords.lng])
    })

    leafletMarkers.push(marker)
  })
}

function selectListingCard(item: any) {
  selectedListing.value = item
  if (leafletMap) {
    leafletMap.panTo([item.coords.lat, item.coords.lng])
    leafletMap.setZoom(14)
  }
}

function statusBadge(status?: string) {
  const s = (status || 'available').toLowerCase()
  if (s === 'rented' || s === 'unavailable') {
    return { text: 'Rented', class: 'bg-amber-100 text-amber-800 border-amber-200' }
  }
  if (s === 'maintenance' || s === 'repair') {
    return { text: 'Maintenance', class: 'bg-rose-100 text-rose-800 border-rose-200' }
  }
  return { text: 'Available', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
}
</script>

<template>
  <div class="bg-white rounded-3xl border border-warm-200/80 shadow-md overflow-hidden flex flex-col">
    <!-- Header Control Bar & Address Finder -->
    <div class="p-4 sm:p-5 bg-warm-50/80 border-b border-warm-200/80 flex flex-col gap-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <!-- Title & Active Location Info -->
        <div>
          <div class="flex items-center gap-2">
            <span class="p-2 bg-brand-100 text-brand-700 rounded-xl">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </span>
            <div>
              <h3 class="font-bold text-warm-900 text-base">Neighborhood Rental Explorer</h3>
              <p class="text-xs text-warm-500 font-medium flex items-center gap-1.5 mt-0.5">
                <span>Center point:</span>
                <span class="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60 truncate max-w-xs">
                  📍 {{ activeOriginAddress || 'Selected Neighborhood' }}
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- Controls: Neighborhood Preset, Radius & Status -->
        <div class="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
          <!-- Neighborhood Selector -->
          <div class="relative">
            <select
              v-model="selectedNeighborhoodId"
              class="pl-3 pr-8 py-2 bg-white border border-warm-200 rounded-xl text-warm-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-semibold shadow-2xs appearance-none cursor-pointer"
            >
              <option v-for="n in NEIGHBORHOODS" :key="n.id" :value="n.id">
                {{ n.name }}
              </option>
            </select>
            <svg class="w-3.5 h-3.5 text-warm-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>

          <!-- Radius Filter -->
          <div class="flex items-center gap-1 bg-white border border-warm-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span class="text-warm-400 font-medium">Radius:</span>
            <select
              v-model="maxRadiusMiles"
              class="bg-transparent text-warm-800 focus:outline-none font-bold cursor-pointer"
            >
              <option :value="1">Within 1 mi</option>
              <option :value="3">Within 3 mi</option>
              <option :value="5">Within 5 mi</option>
              <option :value="10">Within 10 mi</option>
              <option :value="25">Within 25 mi</option>
              <option :value="99">All Areas</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center bg-white border border-warm-200 rounded-xl p-0.5 shadow-2xs">
            <button
              @click="statusFilter = 'all'"
              :class="[statusFilter === 'all' ? 'bg-warm-800 text-white' : 'text-warm-600 hover:text-warm-900', 'px-2.5 py-1 rounded-lg transition-all']"
            >
              All
            </button>
            <button
              @click="statusFilter = 'available'"
              :class="[statusFilter === 'available' ? 'bg-emerald-600 text-white' : 'text-warm-600 hover:text-warm-900', 'px-2.5 py-1 rounded-lg transition-all']"
            >
              Available
            </button>
            <button
              @click="statusFilter = 'rented'"
              :class="[statusFilter === 'rented' ? 'bg-amber-600 text-white' : 'text-warm-600 hover:text-warm-900', 'px-2.5 py-1 rounded-lg transition-all']"
            >
              Rented
            </button>
          </div>
        </div>
      </div>

      <!-- Advanced Address Finder Search Bar -->
      <div class="relative">
        <div class="relative flex items-center">
          <input
            v-model="addressSearchQuery"
            @input="onAddressSearchInput"
            @focus="showAddressSuggestions = addressSuggestions.length > 0"
            type="text"
            placeholder="🔍 Search any specific street address, neighborhood, city or landmark..."
            class="w-full pl-10 pr-24 py-2.5 bg-white border border-warm-200 rounded-2xl text-xs text-warm-900 placeholder-warm-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all shadow-2xs"
          />

          <svg class="w-4 h-4 text-warm-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>

          <button
            type="button"
            @click="locateUserGPS"
            class="absolute right-2.5 px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold rounded-xl border border-brand-200 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>📡 Use GPS</span>
          </button>
        </div>

        <!-- Address Suggestions Dropdown -->
        <div
          v-if="showAddressSuggestions && addressSuggestions.length > 0"
          class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-xl border border-warm-200 overflow-hidden divide-y divide-warm-100 max-h-56 overflow-y-auto"
        >
          <button
            v-for="(item, idx) in addressSuggestions"
            :key="idx"
            type="button"
            @click="selectAddressSuggestion(item)"
            class="w-full text-left px-4 py-2 hover:bg-brand-50/80 transition-colors flex items-start gap-2 text-xs text-warm-800"
          >
            <span class="text-brand-600 mt-0.5 text-sm shrink-0">📍</span>
            <div class="min-w-0 flex-1">
              <p class="font-bold text-warm-900 truncate">{{ item.display_name.split(',')[0] }}</p>
              <p class="text-[10px] text-warm-500 truncate">{{ item.display_name }}</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Map & Item List Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 min-h-[460px] relative">
      <!-- Interactive Map Area -->
      <div class="lg:col-span-2 relative bg-warm-100 min-h-[380px] lg:min-h-[480px]">
        <div ref="mapContainer" class="w-full h-full min-h-[380px] lg:min-h-[480px] z-10"></div>

        <!-- Map Floating Key Legend -->
        <div class="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-warm-200 text-[11px] font-semibold flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Available</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Rented</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Maintenance</span>
          </div>
        </div>

        <!-- Selected Item Card Popup on Map -->
        <Transition name="fade">
          <div
            v-if="selectedListing"
            class="absolute top-4 left-4 right-4 sm:right-auto sm:max-w-sm z-30 bg-white rounded-2xl shadow-xl border border-warm-200 overflow-hidden p-4"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <span :class="[statusBadge(selectedListing.status).class, 'text-[10px] font-bold px-2 py-0.5 rounded-full border']">
                {{ statusBadge(selectedListing.status).text }}
              </span>
              <button
                @click="selectedListing = null"
                class="text-warm-400 hover:text-warm-600 text-sm p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div class="flex gap-3">
              <img
                v-if="listingFirstImage(selectedListing)"
                :src="listingFirstImage(selectedListing)"
                :alt="selectedListing.title"
                class="w-20 h-20 rounded-xl object-cover bg-warm-100 shrink-0 border border-warm-200"
              />
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-warm-900 text-sm truncate leading-snug">
                  {{ selectedListing.title }}
                </h4>
                <p class="text-xs text-warm-500 font-medium mt-0.5 truncate">
                  {{ selectedListing.location }}
                </p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="font-bold text-warm-900 text-sm">${{ Number(selectedListing.daily_rate).toFixed(0) }}/day</span>
                  <span class="text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md font-bold">
                    {{ selectedListing.distanceMiles.toFixed(1) }} mi away
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-3 pt-3 border-t border-warm-100 flex items-center gap-2">
              <button
                @click="router.push(`/listings/${selectedListing.id}`)"
                class="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition-all text-center"
              >
                View Listing
              </button>

              <button
                @click.stop="openDirections(selectedListing)"
                class="px-2.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl border border-brand-200 transition-all flex items-center gap-1 shrink-0"
                title="Get Directions on Google Maps"
              >
                <span>🗺️ Directions</span>
              </button>

              <button
                @click="favoritesStore.toggleFavorite(selectedListing.id)"
                class="p-2 bg-warm-100 hover:bg-rose-50 text-warm-700 hover:text-rose-600 rounded-xl transition-all"
                :title="favoritesStore.isFavorited(selectedListing.id) ? 'Remove Wishlist' : 'Save Wishlist'"
              >
                <svg
                  :class="['w-4 h-4', favoritesStore.isFavorited(selectedListing.id) ? 'text-rose-500 fill-rose-500' : 'text-warm-500']"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Right Side: Distance-Sorted Items Drawer -->
      <div class="border-t lg:border-t-0 lg:border-l border-warm-200/80 bg-warm-50/40 p-4 max-h-[480px] overflow-y-auto flex flex-col gap-3">
        <div class="flex items-center justify-between font-bold text-xs text-warm-700 pb-1 border-b border-warm-200/60">
          <span>Nearby Items</span>
          <span class="text-warm-500 font-medium">Sorted by distance</span>
        </div>

        <div v-if="filteredListings.length === 0" class="text-center py-10">
          <p class="text-warm-500 text-xs font-medium">No rental items found within this radius.</p>
          <button
            @click="maxRadiusMiles = 99; statusFilter = 'all'"
            class="mt-2 text-xs text-brand-600 hover:text-brand-700 font-bold underline"
          >
            Expand search radius
          </button>
        </div>

        <div
          v-for="item in filteredListings"
          :key="item.id"
          @click="selectListingCard(item)"
          :class="[
            selectedListing?.id === item.id ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20' : 'border-warm-200/80 bg-white hover:border-brand-300',
            'p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group'
          ]"
        >
          <!-- Thumbnail -->
          <div class="w-14 h-14 rounded-xl overflow-hidden bg-warm-100 shrink-0 border border-warm-200">
            <img
              v-if="listingFirstImage(item)"
              :src="listingFirstImage(item)"
              :alt="item.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-warm-300 text-xs">📦</div>
          </div>

          <!-- Title & Specs -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <h5 class="font-bold text-warm-900 text-xs truncate group-hover:text-brand-600 transition-colors">
                {{ item.title }}
              </h5>
              <span :class="[statusBadge(item.status).class, 'text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0']">
                {{ statusBadge(item.status).text }}
              </span>
            </div>

            <p class="text-[11px] text-warm-500 truncate mt-0.5">
              {{ item.location }}
            </p>

            <div class="flex items-center justify-between mt-1">
              <span class="font-bold text-warm-900 text-xs">${{ Number(item.daily_rate).toFixed(0) }}<span class="text-[10px] text-warm-400 font-normal">/day</span></span>
              <div class="flex items-center gap-1.5">
                <button
                  @click.stop="openDirections(item)"
                  class="text-[10px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-1.5 py-0.5 rounded-md border border-brand-200 transition-all"
                  title="Open directions in maps"
                >
                  🗺️ Nav
                </button>
                <span class="text-[10px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-md">
                  📍 {{ item.distanceMiles.toFixed(1) }} mi
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Leaflet map custom pin styles */
.leaflet-div-icon {
  background: transparent !important;
  border: none !important;
}
</style>
