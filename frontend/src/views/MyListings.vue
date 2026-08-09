<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listingsAPI } from '../services/api.js'
import { listingImageUrl, listingAllImages } from '../utils/imageUrl'
import { useToast } from '../composables/useToast'

interface Listing {
  id: number
  title: string
  description?: string
  daily_rate: number
  weekly_rate?: number
  monthly_rate?: number
  security_deposit?: number
  category?: { id: number; name: string } | null
  category_id?: number
  company?: { id: number; name: string } | null
  location?: string
  address?: string
  images?: string[]
  status: string
  created_at?: string
  available_from?: string | null
  available_to?: string | null
  reviews_count?: number
  favorited_by_count?: number
  rental_requests_count?: number
  pending_requests_count?: number
  active_requests_count?: number
  completed_requests_count?: number
  user?: { id: number; name: string }
}

interface Stats {
  total: number
  available: number
  rented: number
  maintenance: number
  total_favorites: number
  total_reviews: number
  pending_requests: number
}

const router = useRouter()
const { success, error, info } = useToast()

const listings = ref<Listing[]>([])
const stats = ref<Stats>({ total: 0, available: 0, rented: 0, maintenance: 0, total_favorites: 0, total_reviews: 0, pending_requests: 0 })
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')
const sortBy = ref('created_at')
const sortDir = ref('desc')
const viewMode = ref<'grid' | 'table'>('grid')
const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const deletingId = ref<number | null>(null)
const showDeleteModal = ref(false)
const listingToDelete = ref<Listing | null>(null)
const copiedId = ref<number | null>(null)

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
]

const sortOptions = [
  { value: 'created_at', label: 'Newest' },
  { value: 'daily_rate', label: 'Price' },
  { value: 'title', label: 'Title' },
]

onMounted(() => fetchListings())

async function fetchListings() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      per_page: 12,
      sort: sortBy.value,
      direction: sortDir.value,
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (statusFilter.value) params.status = statusFilter.value

    const res = await listingsAPI.getMyListings(params)
    const data = res.data
    if (data?.listings && Array.isArray(data.listings)) {
      listings.value = data.listings
      const pg = data.pagination || {}
      totalPages.value = pg.last_page || 1
      total.value = pg.total || 0
    } else if (data?.data) {
      // Backward-compatible with plain paginator response
      listings.value = data.data
      totalPages.value = data.last_page || 1
      total.value = data.total || 0
    } else if (Array.isArray(data)) {
      listings.value = data
      total.value = data.length
      totalPages.value = 1
    } else {
      listings.value = []
    }
    if (data?.stats) {
      stats.value = {
        total: data.stats.total ?? 0,
        available: data.stats.available ?? 0,
        rented: data.stats.rented ?? 0,
        maintenance: data.stats.maintenance ?? 0,
        total_favorites: data.stats.total_favorites ?? 0,
        total_reviews: data.stats.total_reviews ?? 0,
        pending_requests: data.stats.pending_requests ?? 0,
      }
    }
  } catch {
    listings.value = []
    error('Failed to load listings')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  currentPage.value = 1
  fetchListings()
}

function applyStatus(val: string) {
  statusFilter.value = val
  currentPage.value = 1
  fetchListings()
}

function applySort(val: string) {
  if (sortBy.value === val) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = val
    sortDir.value = 'desc'
  }
  currentPage.value = 1
  fetchListings()
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchListings()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchListings()
  }
}

function openDeleteModal(listing: Listing) {
  listingToDelete.value = listing
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  listingToDelete.value = null
}

async function confirmDelete() {
  if (!listingToDelete.value) return
  deletingId.value = listingToDelete.value.id
  try {
    await listingsAPI.delete(listingToDelete.value.id)
    listings.value = listings.value.filter((l) => l.id !== listingToDelete.value!.id)
    success('Listing deleted')
    closeDeleteModal()
  } catch {
    error('Failed to delete listing')
  } finally {
    deletingId.value = null
  }
}

async function toggleStatus(listing: Listing) {
  const nextStatus = listing.status === 'available' ? 'maintenance' : 'available'
  try {
    await listingsAPI.update(listing.id, { status: nextStatus, _method: 'PUT' })
    listing.status = nextStatus
    success(`Listing marked ${nextStatus}`)
  } catch {
    error('Failed to update status')
  }
}

function getPrimaryImage(listing: Listing) {
  const all = listingAllImages(listing)
  const fallback = listingImageUrl(listing.images?.[0] ?? null)
  if (all.length) return listingImageUrl(all[0], fallback)
  return fallback
}

function getImages(listing: Listing) {
  return listingAllImages(listing).map((p) => listingImageUrl(p))
}

function imageCount(listing: Listing) {
  return listingAllImages(listing).length
}

function formatRate(val?: number | string) {
  if (val === null || val === undefined || val === '') return null
  return Number(val).toFixed(2)
}

function formatDate(val?: string | null) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200'
    case 'rented':
      return 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200'
    case 'maintenance':
      return 'bg-warm-100 text-warm-600 ring-1 ring-inset ring-warm-200'
    default:
      return 'bg-warm-100 text-warm-600 ring-1 ring-inset ring-warm-200'
  }
}

async function copyLink(listing: Listing) {
  const url = `${window.location.origin}/listings/${listing.id}`
  try {
    await navigator.clipboard.writeText(url)
    copiedId.value = listing.id
    success('Link copied to clipboard')
    setTimeout(() => (copiedId.value = null), 2000)
  } catch {
    error('Failed to copy link')
  }
}

async function shareListing(listing: Listing) {
  const url = `${window.location.origin}/listings/${listing.id}`
  const shareData = {
    title: listing.title,
    text: `Check out "${listing.title}" on Neighbour Renting`,
    url,
  }
  try {
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await copyLink(listing)
    }
  } catch {
    // user dismissed share sheet - ignore
  }
}

function goToRentalRequests(listing: Listing) {
  info(`Viewing requests for "${listing.title}"`)
  router.push({ path: `/listings/${listing.id}`, query: { tab: 'requests' } })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-warm-900">My Listings</h1>
        <p class="text-warm-500 text-sm mt-1">
          {{ total }} listing{{ total === 1 ? '' : 's' }} &middot; Manage, promote & track performance
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm shadow-sm shadow-primary-500/30"
        @click="router.push('/create-listing')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Listing
      </button>
    </div>

    <!-- Stats dashboard -->
    <div v-if="!loading && stats.total" class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.total }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Total</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.available }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Available</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.rented }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Rented</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-warm-100 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-warm-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.maintenance }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Maintenance</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.pending_requests }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Pending Req.</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.total_favorites }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Favorites</p>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-warm-200 p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <svg class="w-4.5 h-4.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
          </svg>
        </div>
        <div>
          <p class="text-xl font-bold text-warm-900 leading-none">{{ stats.total_reviews }}</p>
          <p class="text-[11px] text-warm-500 mt-1">Reviews</p>
        </div>
      </div>
    </div>

    <!-- Controls: search, filters, sort, view toggle -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by title, description or location..."
          class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-warm-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          @input="onSearch"
        />
      </div>

      <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          class="shrink-0 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors"
          :class="statusFilter === opt.value
            ? 'bg-primary-500 text-white border-primary-500'
            : 'bg-white text-warm-600 border-warm-200 hover:bg-warm-50'"
          @click="applyStatus(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="flex items-center gap-2">
        <select
          :value="sortBy"
          class="px-3 py-2.5 text-sm rounded-lg border border-warm-200 text-warm-700 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          @change="applySort(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            Sort: {{ opt.label }}
          </option>
        </select>
        <button
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 transition-colors"
          :title="sortDir === 'desc' ? 'Descending' : 'Ascending'"
          @click="applySort(sortBy)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" v-if="sortDir === 'desc'" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75 4.5 4.5m0 0 4.5-4.5m-4.5 4.5V3" />
            <path stroke-linecap="round" stroke-linejoin="round" v-else d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75 4.5-4.5m0 0 4.5 4.5m-4.5-4.5v12" />
          </svg>
        </button>
        <div class="flex items-center rounded-lg border border-warm-200 overflow-hidden">
          <button
            class="w-10 h-10 flex items-center justify-center transition-colors"
            :class="viewMode === 'grid' ? 'bg-primary-500 text-white' : 'bg-white text-warm-500 hover:bg-warm-50'"
            title="Grid view"
            @click="viewMode = 'grid'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </button>
          <button
            class="w-10 h-10 flex items-center justify-center transition-colors"
            :class="viewMode === 'table' ? 'bg-primary-500 text-white' : 'bg-white text-warm-500 hover:bg-warm-50'"
            title="Table view"
            @click="viewMode = 'table'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6ZM3.75 9h16.5M9 9v11.25M15 9v11.25" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="i in 8" :key="i" class="bg-white rounded-xl border border-warm-200 overflow-hidden animate-pulse">
        <div class="aspect-[4/3] bg-warm-100" />
        <div class="p-4 space-y-3">
          <div class="h-4 bg-warm-100 rounded w-3/4" />
          <div class="h-3 bg-warm-100 rounded w-1/2" />
          <div class="h-6 bg-warm-100 rounded w-2/3" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!listings.length" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-warm-200 mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
      <h3 class="text-lg font-semibold text-warm-700 mb-1">No listings found</h3>
      <p class="text-warm-400 text-sm mb-6">
        {{ searchQuery || statusFilter ? 'Try adjusting your filters.' : 'Create your first listing to start renting.' }}
      </p>
      <button
        class="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        @click="router.push('/create-listing')"
      >
        Create Listing
      </button>
    </div>

    <!-- ============ GRID VIEW ============ -->
    <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div
        v-for="listing in listings"
        :key="listing.id"
        class="bg-white rounded-xl border border-warm-200 overflow-hidden group hover:shadow-card-hover transition-shadow duration-200 flex flex-col"
      >
        <!-- Images -->
        <div class="relative aspect-[4/3] overflow-hidden bg-warm-100 cursor-pointer" @click="router.push(`/listings/${listing.id}`)">
          <template v-if="getImages(listing).length">
            <img
              :src="getImages(listing)[0]"
              :alt="listing.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <!-- Image count badge -->
            <span
              v-if="imageCount(listing) > 1"
              class="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[11px] font-medium rounded-md flex items-center gap-1 backdrop-blur-sm"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
              </svg>
              {{ imageCount(listing) }}
            </span>
          </template>
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-12 h-12 text-warm-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
            </svg>
          </div>

          <!-- Status badge -->
          <span
            class="absolute top-2.5 left-2.5 px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-sm"
            :class="statusBadgeClass(listing.status)"
          >
            {{ listing.status }}
          </span>

          <!-- Category badge -->
          <span
            v-if="listing.category"
            class="absolute top-2.5 right-2.5 px-2.5 py-1 bg-white/90 text-warm-700 text-xs font-medium rounded-full backdrop-blur-sm"
          >
            {{ listing.category.name }}
          </span>
        </div>

        <!-- Body -->
        <div class="p-4 flex flex-col flex-1">
          <h3
            class="font-semibold text-warm-900 text-[15px] leading-snug line-clamp-1 cursor-pointer hover:text-primary-600 transition-colors"
            @click="router.push(`/listings/${listing.id}`)"
          >
            {{ listing.title }}
          </h3>

          <!-- Location -->
          <p v-if="listing.location" class="text-xs text-warm-500 mt-1.5 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span class="line-clamp-1">{{ listing.location }}</span>
          </p>

          <!-- Rates -->
          <div class="mt-3 space-y-1.5">
            <div class="flex items-baseline gap-1">
              <span class="font-bold text-warm-900 text-base">${{ formatRate(listing.daily_rate) }}</span>
              <span class="text-warm-400 text-[11px]">/day</span>
              <span v-if="listing.weekly_rate" class="text-warm-400 text-[11px] ml-2">
                ${{ formatRate(listing.weekly_rate) }}/wk
              </span>
              <span v-if="listing.monthly_rate" class="text-warm-400 text-[11px] ml-2">
                ${{ formatRate(listing.monthly_rate) }}/mo
              </span>
            </div>
          </div>

          <!-- Availability window -->
          <div
            v-if="listing.available_from || listing.available_to"
            class="mt-2 flex items-center gap-1.5 text-[11px] text-warm-500"
          >
            <svg class="w-3.5 h-3.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span>{{ formatDate(listing.available_from) }} → {{ formatDate(listing.available_to) }}</span>
          </div>

          <!-- Stats -->
          <div class="mt-3 flex items-center gap-4 text-[11px] text-warm-500">
            <span class="flex items-center gap-1" title="Favorites">
              <svg class="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
              {{ listing.favorited_by_count ?? 0 }}
            </span>
            <span class="flex items-center gap-1" title="Reviews">
              <svg class="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
              </svg>
              {{ listing.reviews_count ?? 0 }}
            </span>
            <span class="flex items-center gap-1" title="Rental requests">
              <svg class="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              {{ listing.rental_requests_count ?? 0 }}
            </span>
          </div>

          <!-- Description preview -->
          <p v-if="listing.description" class="mt-2.5 text-xs text-warm-500 leading-relaxed line-clamp-2 flex-1">
            {{ listing.description }}
          </p>

          <!-- Actions -->
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button
              class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 transition-colors"
              @click="router.push(`/listings/${listing.id}`)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              View
            </button>
            <button
              class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 transition-colors"
              @click="router.push(`/my-listings/${listing.id}/edit`)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Edit
            </button>
            <button
              class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 transition-colors"
              @click="copyLink(listing)"
            >
              <svg v-if="copiedId !== listing.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              <svg v-else class="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {{ copiedId === listing.id ? 'Copied!' : 'Copy link' }}
            </button>
            <button
              class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 transition-colors"
              @click="shareListing(listing)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
              Share
            </button>
            <button
              class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 transition-colors"
              @click="toggleStatus(listing)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {{ listing.status === 'available' ? 'Pause' : 'Activate' }}
            </button>
            <button
              class="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              :disabled="deletingId === listing.id"
              @click="openDeleteModal(listing)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ TABLE VIEW ============ -->
    <div v-else class="bg-white rounded-xl border border-warm-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-warm-50 text-left text-xs uppercase tracking-wide text-warm-500">
              <th class="px-4 py-3 font-medium">Listing</th>
              <th class="px-4 py-3 font-medium">Status</th>
              <th class="px-4 py-3 font-medium">Price</th>
              <th class="px-4 py-3 font-medium">Location</th>
              <th class="px-4 py-3 font-medium">Favorites</th>
              <th class="px-4 py-3 font-medium">Reviews</th>
              <th class="px-4 py-3 font-medium">Requests</th>
              <th class="px-4 py-3 font-medium">Created</th>
              <th class="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-warm-100">
            <tr v-for="listing in listings" :key="listing.id" class="hover:bg-warm-50/60 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <img
                    v-if="getPrimaryImage(listing)"
                    :src="getPrimaryImage(listing)"
                    :alt="listing.title"
                    class="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div v-else class="w-12 h-12 rounded-lg bg-warm-100 flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-warm-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-warm-900 truncate max-w-[220px]">{{ listing.title }}</p>
                    <p v-if="listing.category" class="text-xs text-warm-400">{{ listing.category.name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="statusBadgeClass(listing.status)"
                >
                  {{ listing.status }}
                </span>
              </td>
              <td class="px-4 py-3 font-semibold text-warm-900">
                ${{ formatRate(listing.daily_rate) }}
                <span class="text-warm-400 font-normal text-xs">/day</span>
              </td>
              <td class="px-4 py-3 text-warm-600 truncate max-w-[180px]">{{ listing.location || '—' }}</td>
              <td class="px-4 py-3 text-warm-600">{{ listing.favorited_by_count ?? 0 }}</td>
              <td class="px-4 py-3 text-warm-600">{{ listing.reviews_count ?? 0 }}</td>
              <td class="px-4 py-3 text-warm-600">{{ listing.rental_requests_count ?? 0 }}</td>
              <td class="px-4 py-3 text-warm-500 text-xs">{{ formatDate(listing.created_at) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button
                    class="p-1.5 rounded-lg text-warm-500 hover:text-warm-800 hover:bg-warm-100 transition-colors"
                    title="View"
                    @click="router.push(`/listings/${listing.id}`)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-warm-500 hover:text-warm-800 hover:bg-warm-100 transition-colors"
                    title="Edit"
                    @click="router.push(`/my-listings/${listing.id}/edit`)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-warm-500 hover:text-warm-800 hover:bg-warm-100 transition-colors"
                    title="Copy link"
                    @click="copyLink(listing)"
                  >
                    <svg v-if="copiedId !== listing.id" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                    <svg v-else class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-warm-500 hover:text-warm-800 hover:bg-warm-100 transition-colors"
                    :title="listing.status === 'available' ? 'Pause' : 'Activate'"
                    @click="toggleStatus(listing)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                    :disabled="deletingId === listing.id"
                    @click="openDeleteModal(listing)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-6">
      <button
        class="px-3 py-1.5 text-sm rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-40 transition-colors"
        :disabled="currentPage <= 1"
        @click="prevPage"
      >
        Previous
      </button>
      <span class="text-sm text-warm-500">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <button
        class="px-3 py-1.5 text-sm rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-40 transition-colors"
        :disabled="currentPage >= totalPages"
        @click="nextPage"
      >
        Next
      </button>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="showDeleteModal && listingToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeDeleteModal" />
      <div class="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-warm-900 mb-1">Delete listing?</h3>
        <p class="text-sm text-warm-500 mb-5">
          Are you sure you want to delete
          <span class="font-semibold text-warm-700">"{{ listingToDelete.title }}"</span>?
          This action cannot be undone.
        </p>
        <div class="flex gap-3">
          <button
            class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-warm-200 text-warm-700 hover:bg-warm-50 transition-colors"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            :disabled="deletingId === listingToDelete.id"
            @click="confirmDelete"
          >
            {{ deletingId === listingToDelete.id ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
</｜｜DSML｜｜>