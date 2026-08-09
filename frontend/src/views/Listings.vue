<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListingCard from '../components/ListingCard.vue'
import ListingCardSkeleton from '../components/ListingCardSkeleton.vue'
import NeighborhoodRentalMap from '../components/NeighborhoodRentalMap.vue'
import StatsCards from '../components/StatsCards.vue'
import CompareModal from '../components/CompareModal.vue'
import JackpotSpotlightBanner from '../components/JackpotSpotlightBanner.vue'
import { useAuthStore } from '../stores/auth'
import { listingsAPI, api } from '../services/api'
import { listingFirstImage } from '../utils/imageUrl'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Comparison selection state
const compareList = ref<number[]>([])
const showCompareModal = ref(false)

function toggleCompare(id: number) {
  if (compareList.value.includes(id)) {
    compareList.value = compareList.value.filter(i => i !== id)
  } else {
    if (compareList.value.length >= 4) {
      alert('You can compare up to 4 items at a time.')
      return
    }
    compareList.value.push(id)
  }
}

function handleRemoveCompareItem(id: number) {
  compareList.value = compareList.value.filter(i => i !== id)
  if (!compareList.value.length) {
    showCompareModal.value = false
  }
}

function clearCompare() {
  compareList.value = []
  showCompareModal.value = false
}

const listings = ref<any[]>([])
const loading = ref(true)
const searchQuery = ref((route.query.search as string) || '')
const selectedCategoryId = ref((route.query.category_id as string) || '')
const sortBy = ref((route.query.sort as string) || 'newest')
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)
const viewMode = ref<'grid' | 'map' | 'list'>('grid')

const categories = ref<any[]>([{ id: '', name: 'All', slug: '' }])

const sortOptions = [
  { value: 'newest', label: 'Newest first', field: 'created_at', direction: 'desc' },
  { value: 'price_low', label: 'Price: low to high', field: 'daily_rate', direction: 'asc' },
  { value: 'price_high', label: 'Price: high to low', field: 'daily_rate', direction: 'desc' },
]

const categoryIcons: Record<string, { icon: string; gradient: string }> = {
  tools: { icon: '🔧', gradient: 'from-amber-50 to-orange-50' },
  electronics: { icon: '📱', gradient: 'from-blue-50 to-indigo-50' },
  vehicles: { icon: '🚗', gradient: 'from-emerald-50 to-teal-50' },
  sports: { icon: '⚽', gradient: 'from-green-50 to-lime-50' },
  books: { icon: '📚', gradient: 'from-violet-50 to-purple-50' },
  clothing: { icon: '👕', gradient: 'from-pink-50 to-rose-50' },
  home: { icon: '🏠', gradient: 'from-yellow-50 to-amber-50' },
}

const categoryTiles = computed(() => {
  return categories.value.map((c) => {
    const meta = categoryIcons[c.slug] || { icon: '✨', gradient: 'from-warm-50 to-warm-100' }
    return { ...c, icon: meta.icon, gradient: meta.gradient }
  })
})

const selectedCategory = computed(() => {
  return categories.value.find((c) => String(c.id) === String(selectedCategoryId.value))
})

const activeFilters = computed(() => {
  const filters: { key: string; label: string; icon: string }[] = []
  if (searchQuery.value.trim()) filters.push({ key: 'search', label: `“${searchQuery.value.trim()}”`, icon: '🔍' })
  if (selectedCategoryId.value && selectedCategory.value) {
    filters.push({ key: 'category', label: selectedCategory.value.name, icon: '📂' })
  }
  return filters
})

const resultLabel = computed(() => {
  if (!totalCount.value) return ''
  const from = (currentPage.value - 1) * (listings.value.length || 8) + 1
  const to = Math.min(
    (currentPage.value - 1) * (listings.value.length || 8) + listings.value.length,
    totalCount.value
  )
  return `Showing ${from}–${to} of ${totalCount.value} items`
})

onMounted(async () => {
  try {
    const res = await api.get('/categories')
    const cats = res.data?.data || res.data || []
    categories.value = [{ id: '', name: 'All', slug: '' }, ...cats]
  } catch {
    // keep default
  }
  fetchListings()
})

async function fetchListings() {
  loading.value = true
  try {
    const sortOpt = sortOptions.find((o) => o.value === sortBy.value) || sortOptions[0]
    const params: Record<string, any> = {
      page: currentPage.value,
      sort: sortOpt.field,
      direction: sortOpt.direction,
    }
    if (searchQuery.value) params.search = searchQuery.value.trim()
    if (selectedCategoryId.value) params.category_id = selectedCategoryId.value

    const response = await listingsAPI.getAll(params)
    const data = response.data
    const items = data?.data || data || []

    if (currentPage.value === 1) {
      listings.value = items
    } else {
      listings.value = [...listings.value, ...items]
    }
    totalPages.value = data?.last_page || 1
    totalCount.value = data?.total ?? data?.meta?.total ?? items.length
  } catch (e) {
    console.error('Failed to load listings:', e)
    if (currentPage.value === 1) listings.value = []
  } finally {
    loading.value = false
  }
}

function updateQuery() {
  const query: Record<string, string> = {}
  if (searchQuery.value.trim()) query.search = searchQuery.value.trim()
  if (selectedCategoryId.value) query.category_id = String(selectedCategoryId.value)
  if (sortBy.value !== 'newest') query.sort = sortBy.value
  router.replace({ query })
}

function selectCategory(catId: string) {
  selectedCategoryId.value = catId
  currentPage.value = 1
  updateQuery()
  fetchListings()
}

function handleSearch() {
  currentPage.value = 1
  updateQuery()
  fetchListings()
}

function handleSort() {
  currentPage.value = 1
  updateQuery()
  fetchListings()
}

function removeFilter(key: string) {
  if (key === 'search') searchQuery.value = ''
  if (key === 'category') selectedCategoryId.value = ''
  currentPage.value = 1
  updateQuery()
  fetchListings()
}

function clearAllFilters() {
  searchQuery.value = ''
  selectedCategoryId.value = ''
  currentPage.value = 1
  updateQuery()
  fetchListings()
}

function handleRent(listing: any) {
  if (!authStore.isAuthenticated.value) {
    router.push('/login')
    return
  }
  router.push(`/listings/${listing.id}`)
}

function loadMore() {
  currentPage.value++
  fetchListings()
}

watch(
  () => route.query,
  (newQuery) => {
    searchQuery.value = (newQuery.search as string) || ''
    selectedCategoryId.value = (newQuery.category_id as string) || ''
    sortBy.value = (newQuery.sort as string) || 'newest'
    fetchListings()
  }
)

// ----- List-view card helpers -----
function primaryImage(listing: any) {
  return listingFirstImage(listing.images)
}

function isAvailable(listing: any) {
  return listing.status === 'available'
}
</script>

<template>
  <div class="min-h-screen -mx-8 -mt-8">
    <!-- ================= HERO HEADER ================= -->
    <section class="relative overflow-hidden bg-gradient-to-br from-white via-[#fdfcfb] to-[#f7f1ec]">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_15%_-10%,rgba(255,90,95,0.08),transparent)]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_90%_10%,rgba(255,194,194,0.12),transparent)]"></div>
      <div class="absolute inset-0 opacity-[0.3]" style="background-image: radial-gradient(rgba(255,90,95,0.12) 1px, transparent 1px); background-size: 26px 26px;"></div>

      <div class="relative max-w-7xl mx-auto px-6 pt-8 pb-6">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-xs text-warm-400 mb-4">
          <router-link to="/" class="hover:text-brand-500 transition-colors">Home</router-link>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span class="text-warm-600 font-medium">Browse listings</span>
        </nav>

        <!-- Weekly Jackpot Winner Banner -->
        <JackpotSpotlightBanner />

        <!-- Tiny Top Stats Strip -->
        <div class="mb-5">
          <StatsCards />
        </div>

        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-warm-200 rounded-full px-4 py-1.5 shadow-xs">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span class="text-xs font-medium text-warm-600">Live · updated just now</span>
            </div>
            <h1 class="mt-4 text-3xl md:text-4xl font-bold text-warm-900 tracking-tight">
              Browse listings
              <span class="text-brand-500">.</span>
            </h1>
            <p class="mt-2 text-warm-500 text-[15px] max-w-lg">
              Find tools, gear and everyday items available to rent right in your neighbourhood.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= MAIN CONTENT ================= -->
    <section class="bg-gradient-to-b from-[#f7f1ec] to-[#FAFAF9]">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <!-- Sticky filter bar -->
        <div class="sticky top-4 z-30 bg-white/90 backdrop-blur-lg border border-warm-200 rounded-2xl shadow-lg p-3 mb-6">
          <div class="flex flex-col lg:flex-row gap-3">
            <!-- Search -->
            <div class="flex-1 relative">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                v-model="searchQuery"
                @keyup.enter="handleSearch"
                type="text"
                placeholder="Search for a drill, tent, camera..."
                class="w-full pl-10 pr-10 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-800 placeholder:text-warm-400 focus:bg-white focus:border-brand-400 transition-colors"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''; handleSearch()"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-warm-200 hover:bg-warm-300 text-warm-600 transition-colors"
                aria-label="Clear search"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Sort -->
            <div class="relative min-w-[200px]">
              <select
                v-model="sortBy"
                @change="handleSort"
                class="w-full appearance-none pl-4 pr-10 py-2.5 bg-warm-50 border border-warm-200 rounded-xl text-sm text-warm-700 cursor-pointer hover:bg-warm-100 focus:bg-white focus:border-brand-400 transition-colors"
              >
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>

            <!-- View toggle -->
            <div class="flex items-center bg-warm-50 border border-warm-200 rounded-xl p-1 shrink-0">
              <button
                @click="viewMode = 'grid'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-warm-500 hover:text-warm-700'"
                aria-label="Grid view"
                title="Grid View"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
              </button>
              <button
                @click="viewMode = 'map'"
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
                :class="viewMode === 'map' ? 'bg-white text-brand-600 shadow-sm' : 'text-warm-500 hover:text-warm-700'"
                aria-label="Map view"
                title="Neighborhood Map View"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503-14.33 4.755 1.585a.75.75 0 0 1 .512.711V18a.75.75 0 0 1-.512.712l-5.25 1.75a.75.75 0 0 1-.456 0l-5.25-1.75a.75.75 0 0 1-.456 0l-5.25 1.75A.75.75 0 0 1 3 19.75V5.5a.75.75 0 0 1 .512-.712l5.25-1.75a.75.75 0 0 1 .456 0l5.25 1.75Z" />
                </svg>
                <span class="text-xs">Map</span>
              </button>
              <button
                @click="viewMode = 'list'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-warm-500 hover:text-warm-700'"
                aria-label="List view"
                title="List View"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </button>
            </div>

            <!-- Search button (mobile friendly) -->
            <button
              @click="handleSearch"
              class="lg:hidden px-6 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 active:bg-brand-700 transition-colors"
            >
              Search
            </button>
          </div>

          <!-- Active filter chips -->
          <div v-if="activeFilters.length" class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-warm-100">
            <span class="text-xs text-warm-400 font-medium">Filters:</span>
            <button
              v-for="filter in activeFilters"
              :key="filter.key"
              @click="removeFilter(filter.key)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full border border-brand-100 hover:bg-brand-100 transition-colors group"
            >
              <span>{{ filter.icon }}</span>
              {{ filter.label }}
              <svg class="w-3 h-3 text-brand-400 group-hover:text-brand-700 transition-colors" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              @click="clearAllFilters"
              class="text-xs text-warm-500 hover:text-brand-600 font-medium underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>

        <!-- Category pills -->
        <div class="mb-6">
          <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" style="scrollbar-width: thin;">
            <button
              v-for="cat in categoryTiles"
              :key="cat.id"
              @click="selectCategory(String(cat.id))"
              class="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 snap-start"
              :class="
                String(selectedCategoryId) === String(cat.id)
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.03]'
                  : 'bg-white border border-warm-200 text-warm-600 hover:border-brand-300 hover:text-brand-600 hover:shadow-sm'
              "
            >
              <span
                v-if="cat.icon"
                class="w-5 h-5 rounded-md flex items-center justify-center text-xs"
                :class="String(selectedCategoryId) === String(cat.id) ? 'bg-white/20' : cat.gradient"
              >
                {{ cat.icon }}
              </span>
              {{ cat.name }}
            </button>
          </div>
        </div>

        <!-- Results header -->
        <div class="flex items-center justify-between mb-5">
          <div>
            <p v-if="!loading && listings.length" class="text-sm text-warm-600 font-medium">{{ resultLabel }}</p>
            <p v-else class="text-sm text-warm-400">{{ loading ? 'Loading items...' : 'No items to show' }}</p>
          </div>
          <div v-if="!loading && listings.length && currentPage < totalPages" class="text-xs text-warm-400">
            Page {{ currentPage }} of {{ totalPages }}
          </div>
        </div>

        <!-- Loading skeletons -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <ListingCardSkeleton :count="8" />
        </div>

        <!-- ============ MAP VIEW ============ -->
        <div v-else-if="listings.length && viewMode === 'map'" class="w-full">
          <NeighborhoodRentalMap :listings="listings" />
        </div>

        <!-- ============ GRID VIEW ============ -->
        <div
          v-else-if="listings.length && viewMode === 'grid'"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          <ListingCard
            v-for="listing in listings"
            :key="listing.id"
            :listing="listing"
            :is-compared="compareList.includes(listing.id)"
            @toggle-compare="toggleCompare"
            @rent="handleRent"
          />
        </div>

        <!-- ============ LIST VIEW ============ -->
        <div v-else-if="listings.length && viewMode === 'list'" class="space-y-4">
          <div
            v-for="listing in listings"
            :key="listing.id"
            @click="router.push(`/listings/${listing.id}`)"
            class="group bg-white rounded-xl border border-warm-200 overflow-hidden hover:shadow-card-hover hover:border-warm-300 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row"
          >
            <!-- Thumb -->
            <div class="relative sm:w-60 lg:w-72 aspect-[4/3] sm:aspect-auto shrink-0 overflow-hidden bg-warm-100">
              <img
                v-if="primaryImage(listing)"
                :src="primaryImage(listing)"
                :alt="listing.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-14 h-14 text-warm-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
                </svg>
              </div>
              <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                <span
                  v-if="!isAvailable(listing)"
                  class="px-2.5 py-1 bg-warm-800/80 text-white text-xs font-medium rounded-full backdrop-blur-sm self-start"
                >
                  Unavailable
                </span>
                <span
                  v-else
                  class="px-2.5 py-1 bg-green-500/90 text-white text-xs font-medium rounded-full backdrop-blur-sm self-start"
                >
                  ● Available
                </span>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 p-5 flex flex-col">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="listing.category"
                      class="px-2 py-0.5 bg-warm-100 text-warm-600 text-[11px] font-medium rounded-full"
                    >
                      {{ listing.category.name || 'Other' }}
                    </span>
                    <span v-if="listing.user" class="text-xs text-warm-400">
                      by {{ listing.user.name }}
                    </span>
                  </div>
                  <h3 class="mt-1.5 font-semibold text-warm-900 text-base leading-snug group-hover:text-brand-600 transition-colors line-clamp-1">
                    {{ listing.title }}
                  </h3>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-bold text-warm-900 text-lg">
                    ${{ Number(listing.daily_rate).toFixed(0) }}
                  </p>
                  <p class="text-warm-400 text-[11px] -mt-0.5">/day</p>
                </div>
              </div>

              <p v-if="listing.description" class="mt-2 text-sm text-warm-500 leading-relaxed line-clamp-2">
                {{ listing.description }}
              </p>

              <div class="mt-3 flex items-center gap-4 text-xs text-warm-500">
                <span v-if="listing.location" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  {{ listing.location }}
                </span>
                <span v-if="listing.user && listing.location" class="text-warm-300">·</span>
                <span v-if="listing.rating" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
                  </svg>
                  {{ Number(listing.rating).toFixed(1) }}
                </span>
              </div>

              <div class="mt-auto pt-4 flex items-center justify-between gap-3">
                <span class="text-xs text-warm-400">
                  {{ listing.rentals_count ? `${listing.rentals_count} rentals` : 'Available now' }}
                </span>
                <button
                  v-if="isAvailable(listing)"
                  @click.stop="handleRent(listing)"
                  class="px-5 py-2 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 active:bg-brand-700 transition-colors shadow-sm"
                >
                  Rent this
                </button>
                <span v-else class="text-xs text-warm-400 font-medium">Not available</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ EMPTY STATE ============ -->
        <div v-else class="text-center py-20 bg-white rounded-2xl border border-dashed border-warm-300">
          <div class="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-brand-50 to-warm-100 rounded-2xl flex items-center justify-center text-4xl animate-float">
            🔍
          </div>
          <h3 class="text-xl font-bold text-warm-900">No listings found</h3>
          <p class="text-warm-500 mt-2 max-w-md mx-auto text-sm">
            We couldn't find anything matching your search. Try adjusting your filters or explore other categories.
          </p>

          <div v-if="activeFilters.length" class="mt-6">
            <button
              @click="clearAllFilters"
              class="px-6 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors"
            >
              Clear all filters
            </button>
          </div>

          <!-- Category suggestions -->
          <div v-if="categoryTiles.length > 1" class="mt-10 max-w-lg mx-auto">
            <p class="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-4">Or browse by category</p>
            <div class="flex flex-wrap justify-center gap-2">
              <button
                v-for="cat in categoryTiles.filter((c) => c.id !== '')"
                :key="cat.id"
                @click="selectCategory(String(cat.id))"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-warm-200 rounded-full text-sm font-medium text-warm-700 hover:border-brand-300 hover:text-brand-600 transition-colors"
              >
                <span>{{ cat.icon }}</span>
                {{ cat.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Load more -->
        <div v-if="!loading && listings.length && currentPage < totalPages" class="text-center mt-10 pb-4">
          <button
            @click="loadMore"
            class="px-8 py-3 bg-white border border-warm-200 text-warm-700 text-sm font-semibold rounded-xl hover:border-brand-400 hover:text-brand-600 hover:shadow-md transition-all inline-flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Load more listings
          </button>
          <p class="text-xs text-warm-400 mt-3">{{ resultLabel }}</p>
        </div>

        <!-- End of results -->
        <div v-if="!loading && listings.length && currentPage >= totalPages" class="text-center py-8">
          <div class="inline-flex items-center gap-2 text-xs text-warm-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            You've reached the end of the list
          </div>
        </div>
      </div>
    </section>

    <!-- Floating Comparison Dock -->
    <Transition name="slide-up">
      <div
        v-if="compareList.length > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] bg-warm-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-warm-700/80 flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-sm shrink-0">
            {{ compareList.length }}
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-warm-300">Compare Rental Rates</h4>
            <p class="text-xs text-warm-100 font-semibold">
              {{ compareList.length }} {{ compareList.length === 1 ? 'item' : 'items' }} selected (max 4)
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="clearCompare"
            class="px-3 py-2 rounded-xl text-xs font-medium text-warm-400 hover:text-white transition-colors cursor-pointer"
          >
            Clear
          </button>

          <button
            @click="showCompareModal = true"
            class="px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <span>Compare Now</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Side-by-Side Compare Modal -->
    <CompareModal
      :show="showCompareModal"
      :listing-ids="compareList"
      @close="showCompareModal = false"
      @remove-item="handleRemoveCompareItem"
    />
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}
</style>