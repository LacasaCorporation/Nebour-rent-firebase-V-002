<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ListingCard from '../components/ListingCard.vue'
import ListingCardSkeleton from '../components/ListingCardSkeleton.vue'
import StatsCards from '../components/StatsCards.vue'
import JackpotSpotlightBanner from '../components/JackpotSpotlightBanner.vue'
import { useAuthStore } from '../stores/auth'
import { listingsAPI, api } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const featuredListings = ref<any[]>([])
const recentListings = ref<any[]>([])
const categories = ref<{ id: number; name: string; slug: string }[]>([])
const loading = ref(true)

// Search inputs
const searchQuery = ref('')
const searchCategory = ref('')
const searchLocation = ref('')

// Discovery tabs
const activeTab = ref('all')

// Carousel scroll state
const carouselEl = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Interactive Savings Estimator state
const estimatorIndex = ref(0)
const estimatorItems = [
  { name: 'DeWalt Cordless Drill Kit', buyPrice: 220, rentRate: 15, monthlyEarnings: 120, icon: '🔧', category: 'Tools & DIY' },
  { name: '4-Person Camping Tent', buyPrice: 350, rentRate: 22, monthlyEarnings: 176, icon: '⛺', category: 'Outdoors' },
  { name: 'Canon Mirrorless Camera', buyPrice: 1800, rentRate: 50, monthlyEarnings: 400, icon: '📷', category: 'Electronics' },
  { name: 'Electric Commuter Bike', buyPrice: 1200, rentRate: 25, monthlyEarnings: 200, icon: '🚲', category: 'Vehicles' },
  { name: 'Pressure Washer 2000 PSI', buyPrice: 280, rentRate: 20, monthlyEarnings: 160, icon: '💦', category: 'Home & Garden' },
]

const currentEstimator = computed(() => estimatorItems[estimatorIndex.value])

const showAllCategories = ref(false)

// Category visual icons and gradients
const categoryIcons: Record<string, { icon: string; gradient: string; sub: string }> = {
  'tools-equipment': { icon: '🔧', gradient: 'bg-amber-50 text-amber-700 border-amber-200/60', sub: 'Drills, Saws, Sanders' },
  'power-tools': { icon: '⚡', gradient: 'bg-amber-50 text-amber-700 border-amber-200/60', sub: 'Cordless, Rotary' },
  'hand-tools': { icon: '🔨', gradient: 'bg-amber-50 text-amber-700 border-amber-200/60', sub: 'Wrenches, Hammers' },
  'garden-tools': { icon: '🌱', gradient: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', sub: 'Mowers, Trimmers' },
  'vehicles': { icon: '🚗', gradient: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', sub: 'Cars, E-Bikes, Scooters' },
  'cars': { icon: '🚘', gradient: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', sub: 'Sedans, SUVs' },
  'bikes': { icon: '🚲', gradient: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', sub: 'E-Bikes, Road' },
  'scooters': { icon: '🛴', gradient: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', sub: 'Electric, City' },
  'space-property': { icon: '🏠', gradient: 'bg-blue-50 text-blue-700 border-blue-200/60', sub: 'Meeting Rooms, Parking' },
  'meeting-rooms': { icon: '🏢', gradient: 'bg-blue-50 text-blue-700 border-blue-200/60', sub: 'Offices, Studios' },
  'event-spaces': { icon: '🏛️', gradient: 'bg-blue-50 text-blue-700 border-blue-200/60', sub: 'Halls, Venues' },
  'parking': { icon: '🅿️', gradient: 'bg-blue-50 text-blue-700 border-blue-200/60', sub: 'Driveways, Garages' },
  'electronics': { icon: '💻', gradient: 'bg-purple-50 text-purple-700 border-purple-200/60', sub: 'Cameras, Audio, Laptops' },
  'laptops': { icon: '💻', gradient: 'bg-purple-50 text-purple-700 border-purple-200/60', sub: 'MacBooks, PCs' },
  'cameras': { icon: '📷', gradient: 'bg-purple-50 text-purple-700 border-purple-200/60', sub: 'DSLR, Lenses' },
  'audio': { icon: '🎧', gradient: 'bg-purple-50 text-purple-700 border-purple-200/60', sub: 'Speakers, Mics' },
  'sports-outdoors': { icon: '⚽', gradient: 'bg-green-50 text-green-700 border-green-200/60', sub: 'Camping, Kayaks, Gear' },
  'camping-gear': { icon: '⛺', gradient: 'bg-green-50 text-green-700 border-green-200/60', sub: 'Tents, Sleeping Bags' },
  'sports-equipment': { icon: '🎾', gradient: 'bg-green-50 text-green-700 border-green-200/60', sub: 'Rackets, Balls' },
  'kayaks-water': { icon: '🚣', gradient: 'bg-green-50 text-green-700 border-green-200/60', sub: 'Kayaks, SUPs' },
  'party-events': { icon: '🎉', gradient: 'bg-rose-50 text-rose-700 border-rose-200/60', sub: 'Tables, Tents, Speakers' },
  'tables-chairs': { icon: '🪑', gradient: 'bg-rose-50 text-rose-700 border-rose-200/60', sub: 'Folding, Dining' },
  'tents-canopies': { icon: '🎪', gradient: 'bg-rose-50 text-rose-700 border-rose-200/60', sub: 'Pop-Up, Shade' },
  'sound-systems': { icon: '🔊', gradient: 'bg-rose-50 text-rose-700 border-rose-200/60', sub: 'PA, DJ Gear' },
}

const sortedCategoryTiles = computed(() => {
  const parents = categories.value.filter(c => !(c as any).parent_id)
  const subs = categories.value.filter(c => (c as any).parent_id)
  const ordered = parents.length > 0 ? [...parents, ...subs] : categories.value
  return ordered.map((c) => {
    const meta = categoryIcons[c.slug] || { icon: '📦', gradient: 'bg-warm-100 text-warm-700 border-warm-200/60', sub: 'Browse items' }
    return { ...c, icon: meta.icon, gradient: meta.gradient, sub: meta.sub }
  })
})

const visibleCategories = computed(() => {
  if (showAllCategories.value) {
    return sortedCategoryTiles.value
  }
  return sortedCategoryTiles.value.slice(0, 6)
})

// Filtered listings for the discovery tab section
const tabFilteredListings = computed(() => {
  if (activeTab.value === 'all') return featuredListings.value
  return featuredListings.value.filter(item => {
    const slug = item.category?.slug || ''
    if (activeTab.value === 'tools') return slug.includes('tool')
    if (activeTab.value === 'vehicles') return slug.includes('vehicle') || slug.includes('car') || slug.includes('bike')
    if (activeTab.value === 'electronics') return slug.includes('electronic') || slug.includes('camera') || slug.includes('laptop')
    if (activeTab.value === 'sports') return slug.includes('sport') || slug.includes('camp') || slug.includes('outdoor')
    if (activeTab.value === 'party') return slug.includes('party') || slug.includes('event')
    return true
  })
})

onMounted(async () => {
  try {
    const [listingsRes, catsRes, recentRes] = await Promise.all([
      listingsAPI.getAll({ limit: 12, sort: 'rating', direction: 'desc' }),
      api.get('/categories'),
      listingsAPI.getAll({ limit: 4 }),
    ])
    featuredListings.value = listingsRes.data?.data || listingsRes.data || []
    recentListings.value = recentRes.data?.data || recentRes.data || []
    categories.value = catsRes.data?.data || catsRes.data || []
    updateCarouselArrows()
  } catch (e) {
    console.error('Failed to load home page data:', e)
  } finally {
    loading.value = false
  }
})

function browseCategory(categoryId: number) {
  router.push({ path: '/listings', query: { category_id: String(categoryId) } })
}

function quickTagSearch(tag: string, catId?: number) {
  searchQuery.value = tag
  if (catId) searchCategory.value = String(catId)
  handleSearch()
}

function handleSearch() {
  const query: Record<string, string> = {}
  if (searchQuery.value.trim()) query.search = searchQuery.value.trim()
  if (searchCategory.value) query.category_id = searchCategory.value
  if (searchLocation.value) query.location = searchLocation.value
  router.push({ path: '/listings', query })
}

function handleRent(listing: any) {
  if (!authStore.isAuthenticated.value) {
    router.push('/login')
    return
  }
  router.push(`/listings/${listing.id}`)
}

function scrollCarousel(direction: number) {
  if (!carouselEl.value) return
  carouselEl.value.scrollBy({ left: direction * 360, behavior: 'smooth' })
}

function updateCarouselArrows() {
  requestAnimationFrame(() => {
    if (!carouselEl.value) return
    const { scrollLeft, scrollWidth, clientWidth } = carouselEl.value
    canScrollLeft.value = scrollLeft > 5
    canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 5
  })
}
</script>

<template>
  <div class="min-h-screen -mx-8 -mt-8 mb-0 bg-surface-alt">
    <!-- Top Announcement Ticker Bar -->
    <div class="bg-warm-900 text-warm-200 text-xs font-medium py-2 px-4 text-center flex items-center justify-center gap-3">
      <span class="inline-flex items-center gap-1.5 bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-semibold text-[11px] uppercase tracking-wider">
        ✨ Live Neighbourhood
      </span>
      <span>100% ID Verified Lenders · Zero Signup Fees · $1,000,000 Community Protection</span>
      <router-link to="/listings" class="hidden sm:inline text-brand-400 font-semibold underline hover:text-brand-300">
        Browse Near You &rarr;
      </router-link>
    </div>

    <!-- ================= HERO SECTION ================= -->
    <section class="relative overflow-hidden bg-gradient-to-b from-white via-warm-50/70 to-surface-alt border-b border-warm-200/60">
      <!-- Ambient Glow Blobs -->
      <div class="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl pointer-events-none"></div>
      <div class="absolute inset-0 opacity-[0.25] pointer-events-none" style="background-image: radial-gradient(rgba(68,64,60,0.12) 1px, transparent 1px); background-size: 28px 28px;"></div>

      <div class="relative max-w-7xl mx-auto px-6 pt-6 pb-12 lg:pb-20">
        <!-- Weekly Jackpot Winner Top Banner -->
        <JackpotSpotlightBanner />

        <!-- Tiny Top Stats Strip -->
        <div class="mb-8">
          <StatsCards />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <!-- LEFT HERO COLUMN -->
          <div class="lg:col-span-7">
            <!-- Active Location Badge -->
            <div class="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md border border-warm-200 rounded-full px-3.5 py-1.5 shadow-xs mb-6">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span class="text-xs font-semibold text-warm-700">Available in Brooklyn, Queens & Manhattan</span>
            </div>

            <!-- Main Headline -->
            <h1 class="font-display text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-warm-900 tracking-tight leading-[1.12]">
              Rent anything from
              <span class="text-brand-500 relative inline-block whitespace-nowrap">
                neighbours
                <svg class="absolute -bottom-2.5 left-0 w-full text-brand-300" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none">
                  <path d="M2 9C50 3 150 3 198 9" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
                </svg>
              </span>
              near you.
            </h1>

            <p class="mt-6 text-base sm:text-lg text-warm-600 leading-relaxed max-w-2xl font-normal">
              Skip buying expensive tools, bikes, camping gear, and event equipment. Rent directly from trusted local owners for a fraction of the cost.
            </p>

            <!-- Search Card Box -->
            <div class="mt-8 bg-white rounded-2xl shadow-lg border border-warm-200 p-2 sm:p-3">
              <div class="flex flex-col md:flex-row gap-2">
                <!-- Keyword search input -->
                <div class="flex-1 flex items-center gap-2.5 px-3 py-1 bg-warm-50/60 rounded-xl border border-warm-100 focus-within:border-brand-400 focus-within:bg-white transition-all">
                  <svg class="w-5 h-5 text-warm-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search DeWalt drill, tent, camera, bike..."
                    class="w-full py-2 text-sm text-warm-900 placeholder-warm-400 focus:outline-none bg-transparent"
                    @keyup.enter="handleSearch"
                  />
                </div>

                <!-- Category select -->
                <div class="flex items-center gap-1.5 px-3 py-1 bg-warm-50/60 rounded-xl border border-warm-100 min-w-[150px]">
                  <select
                    v-model="searchCategory"
                    class="w-full py-2 text-xs font-semibold text-warm-700 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="">All Categories</option>
                    <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>

                <!-- Search button -->
                <button
                  @click="handleSearch"
                  class="px-6 py-3 bg-brand-500 text-white font-semibold text-sm rounded-xl hover:bg-brand-600 active:bg-brand-700 transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Search Items</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              <!-- Popular Quick Search Tag Chips -->
              <div class="mt-3 pt-3 border-t border-warm-100 flex items-center gap-2 overflow-x-auto text-xs text-warm-500 whitespace-nowrap pb-1">
                <span class="font-semibold text-warm-700 shrink-0">Popular:</span>
                <button
                  @click="quickTagSearch('drill', 1)"
                  class="px-2.5 py-1 bg-warm-100/70 hover:bg-brand-50 hover:text-brand-600 rounded-md transition-colors"
                >
                  🔨 Cordless Drill
                </button>
                <button
                  @click="quickTagSearch('tent', 5)"
                  class="px-2.5 py-1 bg-warm-100/70 hover:bg-brand-50 hover:text-brand-600 rounded-md transition-colors"
                >
                  ⛺ Camping Tent
                </button>
                <button
                  @click="quickTagSearch('camera', 4)"
                  class="px-2.5 py-1 bg-warm-100/70 hover:bg-brand-50 hover:text-brand-600 rounded-md transition-colors"
                >
                  📷 Canon R6
                </button>
                <button
                  @click="quickTagSearch('bike', 2)"
                  class="px-2.5 py-1 bg-warm-100/70 hover:bg-brand-50 hover:text-brand-600 rounded-md transition-colors"
                >
                  🚲 E-Bike
                </button>
                <button
                  @click="quickTagSearch('car', 2)"
                  class="px-2.5 py-1 bg-warm-100/70 hover:bg-brand-50 hover:text-brand-600 rounded-md transition-colors"
                >
                  🚘 Honda Civic
                </button>
              </div>
            </div>

            <!-- Trust micro-row -->
            <div class="mt-6 flex flex-wrap items-center gap-6 text-xs font-semibold text-warm-600">
              <div class="flex items-center gap-1.5">
                <div class="flex text-amber-400">
                  <span v-for="i in 5" :key="i">★</span>
                </div>
                <span>4.9/5 from 1,200+ reviews</span>
              </div>
              <div class="flex items-center gap-1.5 text-emerald-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                <span>Verified Neighbour Profiles</span>
              </div>
              <div class="flex items-center gap-1.5 text-brand-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span>Same-day Pickups</span>
              </div>
            </div>
          </div>

          <!-- RIGHT HERO COLUMN: Interactive Feature Deck Card -->
          <div class="lg:col-span-5 relative">
            <div class="relative max-w-md mx-auto">
              <!-- Background Accent Card Layer -->
              <div class="absolute -inset-2 bg-gradient-to-tr from-brand-400 to-amber-300 rounded-3xl blur-xl opacity-20 transform rotate-2"></div>
              
              <!-- Main Spotlight Hero Card -->
              <div class="relative bg-white rounded-2xl border border-warm-200/80 shadow-xl overflow-hidden">
                <!-- Image Header with overlay badges -->
                <div class="relative aspect-[16/10] bg-warm-100 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1504148455328-c376907d081c?w=700"
                    alt="DeWalt Cordless Drill Kit"
                    class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  <div class="absolute top-3 left-3 flex items-center gap-2">
                    <span class="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-bold uppercase rounded-full shadow-xs">
                      Available Today
                    </span>
                    <span class="px-2.5 py-1 bg-white/90 backdrop-blur-md text-warm-800 text-[11px] font-semibold rounded-full shadow-xs">
                      📍 0.3 mi away
                    </span>
                  </div>

                  <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <p class="text-xs font-medium text-warm-200">Tools & DIY</p>
                      <h3 class="text-lg font-bold leading-tight">DeWalt Cordless Drill Kit</h3>
                    </div>
                    <div class="text-right bg-brand-500 px-3 py-1 rounded-xl font-bold text-sm shadow-md">
                      $15 <span class="text-[10px] font-normal opacity-90">/day</span>
                    </div>
                  </div>
                </div>

                <!-- Card Body & Renter Info -->
                <div class="p-4 bg-white space-y-3">
                  <div class="flex items-center justify-between text-xs text-warm-600">
                    <div class="flex items-center gap-2">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
                        alt="Owner avatar"
                        class="w-7 h-7 rounded-full object-cover border border-warm-200"
                      />
                      <div>
                        <p class="font-semibold text-warm-900">Alice Johnson</p>
                        <p class="text-[10px] text-warm-400">Super Lender · 48 rentals</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 font-bold text-warm-800">
                      <span class="text-amber-400 text-sm">★</span>
                      <span>4.9</span>
                      <span class="text-warm-400 font-normal text-[11px]">(28)</span>
                    </div>
                  </div>

                  <div class="pt-2 border-t border-warm-100 flex items-center justify-between gap-2">
                    <span class="text-xs text-warm-500 font-medium">Security Deposit: $50</span>
                    <button
                      @click="router.push('/listings/1')"
                      class="px-4 py-1.5 bg-warm-900 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      View Details & Book
                    </button>
                  </div>
                </div>
              </div>

              <!-- Floating Trust Badge 1 -->
              <div class="absolute -bottom-5 -left-6 bg-white/95 backdrop-blur-md border border-warm-200 rounded-xl p-3 shadow-lg flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0">
                  🛡️
                </div>
                <div>
                  <p class="text-xs font-bold text-warm-900">$1,000,000 Guarantee</p>
                  <p class="text-[10px] text-warm-500">Every rental protected</p>
                </div>
              </div>

              <!-- Floating Trust Badge 2 -->
              <div class="absolute -top-4 -right-4 bg-white/95 backdrop-blur-md border border-warm-200 rounded-xl p-2.5 shadow-lg flex items-center gap-2">
                <span class="text-base">⚡</span>
                <span class="text-xs font-bold text-warm-800">Fast 15-min Response</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ================= CATEGORIES SECTION ================= -->
    <section class="bg-white py-12 border-b border-warm-200/60">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-brand-500 uppercase tracking-wider">Categories</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 font-semibold">
                {{ sortedCategoryTiles.length }} total
              </span>
            </div>
            <h2 class="font-display text-xl sm:text-2xl font-extrabold text-warm-900 mt-0.5">
              Explore neighbourhood catalog
            </h2>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="sortedCategoryTiles.length > 6"
              @click="showAllCategories = !showAllCategories"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition-all cursor-pointer shadow-2xs"
            >
              <span>{{ showAllCategories ? 'Show Main Only' : `More Categories (${sortedCategoryTiles.length - 6})` }}</span>
              <svg class="w-3.5 h-3.5 transition-transform duration-200" :class="{ 'rotate-180': showAllCategories }" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <router-link
              to="/listings"
              class="text-xs font-semibold text-warm-500 hover:text-brand-600 inline-flex items-center gap-1 transition-colors"
            >
              View All &rarr;
            </router-link>
          </div>
        </div>

        <!-- Tiny Category Cards Grid (1 line when collapsed, all when expanded) -->
        <div v-if="categories.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            v-for="cat in visibleCategories"
            :key="cat.id"
            @click="browseCategory(cat.id)"
            class="group flex items-center gap-2 px-2.5 py-2 rounded-xl border border-warm-200/90 bg-warm-50/50 hover:bg-white hover:border-brand-400 hover:shadow-2xs transition-all duration-150 text-left cursor-pointer overflow-hidden min-w-0"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border border-warm-200/40 group-hover:scale-105 transition-transform" :class="cat.gradient">
              {{ cat.icon }}
            </div>
            <div class="min-w-0 flex-1 leading-tight">
              <h3 class="font-bold text-warm-900 text-xs truncate group-hover:text-brand-600 transition-colors">
                {{ cat.name }}
              </h3>
            </div>
          </button>
        </div>
        
        <div v-else-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div v-for="i in 6" :key="i" class="h-10 bg-warm-100 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </section>

    <!-- ================= INTERACTIVE SAVINGS ESTIMATOR ================= -->
    <section class="bg-gradient-to-br from-warm-900 via-warm-800 to-warm-900 text-white py-16 overflow-hidden relative">
      <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px); background-size: 24px 24px;"></div>
      <div class="max-w-7xl mx-auto px-6 relative">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <!-- Left Estimator Copy -->
          <div class="lg:col-span-5 space-y-4">
            <span class="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              💰 Smart Community Economy
            </span>
            <h2 class="font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Why buy when you can borrow?
            </h2>
            <p class="text-warm-300 text-sm leading-relaxed">
              The average power tool is used for only 13 minutes in its entire lifespan. Save up to 90% by renting when you need it, or list your items to earn steady income.
            </p>

            <!-- Estimator item selector tabs -->
            <div class="pt-2 flex flex-wrap gap-2">
              <button
                v-for="(item, idx) in estimatorItems"
                :key="item.name"
                @click="estimatorIndex = idx"
                :class="[
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border',
                  estimatorIndex === idx
                    ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                    : 'bg-warm-800/80 text-warm-300 border-warm-700 hover:bg-warm-700'
                ]"
              >
                <span>{{ item.icon }}</span>
                <span>{{ item.category }}</span>
              </button>
            </div>
          </div>

          <!-- Right Interactive Estimator Card -->
          <div class="lg:col-span-7">
            <div class="bg-white text-warm-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-warm-200">
              <div class="flex items-center justify-between pb-6 border-b border-warm-200">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 font-bold text-2xl flex items-center justify-center">
                    {{ currentEstimator.icon }}
                  </div>
                  <div>
                    <p class="text-xs text-warm-500 uppercase font-bold tracking-wider">{{ currentEstimator.category }}</p>
                    <h3 class="text-lg font-bold text-warm-900">{{ currentEstimator.name }}</h3>
                  </div>
                </div>
                <span class="px-3 py-1 bg-warm-100 text-warm-700 text-xs font-bold rounded-full">
                  Sample Estimate
                </span>
              </div>

              <!-- Comparison Cards Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <!-- Buy Cost -->
                <div class="bg-warm-50 rounded-xl p-4 border border-warm-200/80 text-center">
                  <p class="text-xs font-medium text-warm-500">Retail Buy Price</p>
                  <p class="text-2xl font-extrabold text-warm-800 mt-1">${{ currentEstimator.buyPrice }}</p>
                  <p class="text-[10px] text-warm-400 mt-1">Sitting in closet 98% of time</p>
                </div>

                <!-- Rent Cost -->
                <div class="bg-brand-50 rounded-xl p-4 border border-brand-200 text-center">
                  <p class="text-xs font-bold text-brand-600">Borrower Cost</p>
                  <p class="text-2xl font-extrabold text-brand-600 mt-1">${{ currentEstimator.rentRate }}<span class="text-xs font-normal">/day</span></p>
                  <p class="text-[10px] font-semibold text-brand-700 mt-1">Save ~${{ currentEstimator.buyPrice - currentEstimator.rentRate }} per use!</p>
                </div>

                <!-- Lender Potential -->
                <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                  <p class="text-xs font-bold text-emerald-700">Lender Earnings</p>
                  <p class="text-2xl font-extrabold text-emerald-700 mt-1">~${{ currentEstimator.monthlyEarnings }}<span class="text-xs font-normal">/mo</span></p>
                  <p class="text-[10px] text-emerald-800 font-medium mt-1">Rented just 8 days/month</p>
                </div>
              </div>

              <!-- Action Footer -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-warm-100">
                <p class="text-xs text-warm-500 text-center sm:text-left">
                  Have items at home? Turn your unused equipment into passive income.
                </p>
                <router-link
                  :to="authStore.isAuthenticated ? '/create-listing' : '/register'"
                  class="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm whitespace-nowrap"
                >
                  List An Item Free
                </router-link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ================= FILTERABLE DISCOVERY SHOWCASE ================= -->
    <section class="bg-surface-alt py-16">
      <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span class="text-xs font-bold text-brand-500 uppercase tracking-wider">Top Rated</span>
            <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-warm-900 mt-1">
              Popular items near you
            </h2>
            <p class="text-sm text-warm-500 mt-1">Inspected and highly rated by neighbourhood renters</p>
          </div>

          <!-- Category filter tabs -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 max-w-full text-xs font-semibold">
            <button
              @click="activeTab = 'all'"
              :class="activeTab === 'all' ? 'bg-warm-900 text-white' : 'bg-white text-warm-600 hover:bg-warm-100 border border-warm-200'"
              class="px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              All Items
            </button>
            <button
              @click="activeTab = 'tools'"
              :class="activeTab === 'tools' ? 'bg-warm-900 text-white' : 'bg-white text-warm-600 hover:bg-warm-100 border border-warm-200'"
              class="px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              🔨 Tools & DIY
            </button>
            <button
              @click="activeTab = 'vehicles'"
              :class="activeTab === 'vehicles' ? 'bg-warm-900 text-white' : 'bg-white text-warm-600 hover:bg-warm-100 border border-warm-200'"
              class="px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              🚗 Vehicles & Bikes
            </button>
            <button
              @click="activeTab = 'electronics'"
              :class="activeTab === 'electronics' ? 'bg-warm-900 text-white' : 'bg-white text-warm-600 hover:bg-warm-100 border border-warm-200'"
              class="px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              💻 Tech & Camera
            </button>
            <button
              @click="activeTab = 'sports'"
              :class="activeTab === 'sports' ? 'bg-warm-900 text-white' : 'bg-white text-warm-600 hover:bg-warm-100 border border-warm-200'"
              class="px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              ⛺ Outdoors
            </button>
          </div>
        </div>

        <!-- Grid of Listing Cards -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ListingCardSkeleton :count="4" />
        </div>

        <div v-else-if="tabFilteredListings.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ListingCard
            v-for="listing in tabFilteredListings"
            :key="listing.id"
            :listing="listing"
            @rent="handleRent"
          />
        </div>

        <div v-else class="bg-white rounded-2xl border border-warm-200 p-12 text-center my-6">
          <div class="w-14 h-14 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
            📦
          </div>
          <h3 class="font-bold text-warm-900">No listings found in this category</h3>
          <p class="text-xs text-warm-500 mt-1 max-w-sm mx-auto">
            Be the first neighbour to list an item in this category and start earning!
          </p>
          <router-link
            to="/create-listing"
            class="inline-block mt-4 px-5 py-2 bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-xs"
          >
            List an Item Now
          </router-link>
        </div>
      </div>
    </section>

    <!-- ================= HOW IT WORKS ================= -->
    <section class="bg-white py-16 border-t border-warm-200/80">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <span class="text-xs font-bold text-brand-500 uppercase tracking-wider">Simple Process</span>
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-warm-900 mt-1">
            How neighbour renting works
          </h2>
          <p class="text-sm text-warm-500 mt-2">Rent what you need in 3 straightforward steps with total peace of mind</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <!-- Step 1 -->
          <div class="bg-warm-50/80 rounded-2xl border border-warm-200/90 p-6 relative hover:shadow-card-hover transition-shadow">
            <div class="w-10 h-10 rounded-xl bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
              01
            </div>
            <h3 class="font-bold text-warm-900 text-base mb-1">Find Nearby Gear</h3>
            <p class="text-xs text-warm-600 leading-relaxed">
              Search by item name or category to find tools, vehicles, or gear available within walking or driving distance in your area.
            </p>
          </div>

          <!-- Step 2 -->
          <div class="bg-warm-50/80 rounded-2xl border border-warm-200/90 p-6 relative hover:shadow-card-hover transition-shadow">
            <div class="w-10 h-10 rounded-xl bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
              02
            </div>
            <h3 class="font-bold text-warm-900 text-base mb-1">Request & Chat</h3>
            <p class="text-xs text-warm-600 leading-relaxed">
              Choose your rental dates, send a request, and message the owner directly to arrange convenient pickup details.
            </p>
          </div>

          <!-- Step 3 -->
          <div class="bg-warm-50/80 rounded-2xl border border-warm-200/90 p-6 relative hover:shadow-card-hover transition-shadow">
            <div class="w-10 h-10 rounded-xl bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-sm">
              03
            </div>
            <h3 class="font-bold text-warm-900 text-base mb-1">Pickup & Return</h3>
            <p class="text-xs text-warm-600 leading-relaxed">
              Pick up the item, complete your project or adventure, and return it safely. Rate your experience to build community trust.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= TRUST & SAFETY GUARANTEES ================= -->
    <section class="bg-surface-alt py-16 border-t border-warm-200/60">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div class="bg-white p-5 rounded-2xl border border-warm-200 flex items-start gap-3 shadow-xs">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
              🛡️
            </div>
            <div>
              <h4 class="font-bold text-warm-900 text-sm">Community Guarantee</h4>
              <p class="text-xs text-warm-500 mt-1">Up to $1,000,000 protection on listed items for total peace of mind.</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-warm-200 flex items-start gap-3 shadow-xs">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              🪪
            </div>
            <div>
              <h4 class="font-bold text-warm-900 text-sm">ID Verified Members</h4>
              <p class="text-xs text-warm-500 mt-1">All members undergo identity checks before booking or lending.</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-warm-200 flex items-start gap-3 shadow-xs">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
              💬
            </div>
            <div>
              <h4 class="font-bold text-warm-900 text-sm">Direct Messaging</h4>
              <p class="text-xs text-warm-500 mt-1">In-app chat keeps your contact details secure until pickup.</p>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-warm-200 flex items-start gap-3 shadow-xs">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
              🌱
            </div>
            <div>
              <h4 class="font-bold text-warm-900 text-sm">Eco-Friendly Sharing</h4>
              <p class="text-xs text-warm-500 mt-1">Reduce consumer waste and support a circular local economy.</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ================= TESTIMONIALS ================= -->
    <section class="bg-white py-16 border-t border-warm-200/80">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-xl mx-auto mb-10">
          <span class="text-xs font-bold text-brand-500 uppercase tracking-wider">Community Stories</span>
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-warm-900 mt-1">
            Loved by local neighbours
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-warm-50/70 p-6 rounded-2xl border border-warm-200/80 flex flex-col justify-between">
            <div>
              <div class="flex text-amber-400 text-sm mb-3">★★★★★</div>
              <p class="text-xs text-warm-700 leading-relaxed font-normal">
                "Needed a pressure washer to clean my patio. Renting it from Marcus down the block took 5 minutes and saved me $280. Incredible service!"
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-warm-200/60 flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" class="w-8 h-8 rounded-full object-cover" />
              <div>
                <p class="text-xs font-bold text-warm-900">David M.</p>
                <p class="text-[10px] text-warm-400">Brooklyn · Member since 2025</p>
              </div>
            </div>
          </div>

          <div class="bg-warm-50/70 p-6 rounded-2xl border border-warm-200/80 flex flex-col justify-between">
            <div>
              <div class="flex text-amber-400 text-sm mb-3">★★★★★</div>
              <p class="text-xs text-warm-700 leading-relaxed font-normal">
                "I put my camping gear on Neighbour Renting and made over $350 last month. It was just sitting in my closet anyway!"
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-warm-200/60 flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" class="w-8 h-8 rounded-full object-cover" />
              <div>
                <p class="text-xs font-bold text-warm-900">Elena R.</p>
                <p class="text-[10px] text-warm-400">Queens · Super Lender</p>
              </div>
            </div>
          </div>

          <div class="bg-warm-50/70 p-6 rounded-2xl border border-warm-200/80 flex flex-col justify-between">
            <div>
              <div class="flex text-amber-400 text-sm mb-3">★★★★★</div>
              <p class="text-xs text-warm-700 leading-relaxed font-normal">
                "Rented a projector and screen for my daughter's backyard birthday party. Pickup was effortless and the owner was so helpful."
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-warm-200/60 flex items-center gap-3">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" class="w-8 h-8 rounded-full object-cover" />
              <div>
                <p class="text-xs font-bold text-warm-900">Samir K.</p>
                <p class="text-[10px] text-warm-400">Manhattan · Verified Renter</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= BOTTOM CALL TO ACTION ================= -->
    <section class="bg-gradient-to-r from-brand-600 via-brand-500 to-rose-500 text-white py-16 relative overflow-hidden">
      <div class="max-w-5xl mx-auto px-6 text-center relative z-10">
        <h2 class="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to join your local rental network?
        </h2>
        <p class="text-brand-100 text-sm sm:text-base mt-3 max-w-xl mx-auto">
          Start borrowing tools & gear or turn your unused items into steady monthly income today.
        </p>

        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <router-link
            to="/listings"
            class="w-full sm:w-auto px-8 py-3.5 bg-white text-brand-600 font-bold text-sm rounded-xl hover:bg-warm-50 transition-all shadow-lg cursor-pointer"
          >
            Explore Listings
          </router-link>
          <router-link
            :to="authStore.isAuthenticated ? '/create-listing' : '/register'"
            class="w-full sm:w-auto px-8 py-3.5 bg-brand-700/60 hover:bg-brand-700 border border-white/30 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            List an Item Free
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>
