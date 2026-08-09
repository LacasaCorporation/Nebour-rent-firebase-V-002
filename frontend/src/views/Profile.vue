<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import api, { listingsAPI } from '../services/api.js'
import ListingCard from '../components/ListingCard.vue'
import { listingFirstImage } from '../utils/imageUrl.js'

const authStore = useAuthStore()
const router = useRouter()
const user = computed(() => authStore.currentUser)

const activeTab = ref('listings') // 'listings' | 'active-rentals' | 'history'

// Data state
const listings = ref([])
const rentalRequests = ref([])
const loading = ref(true)
const actionLoadingId = ref(null)
const deletingListingId = ref(null)

// Filters
const activeRoleFilter = ref('all') // 'all' | 'renter' | 'lender'
const activeSubStatusFilter = ref('all') // 'all' | 'pending' | 'accepted' | 'active'

const historyStatusFilter = ref('all') // 'all' | 'completed' | 'cancelled' | 'rejected'
const historyRoleFilter = ref('all') // 'all' | 'renter' | 'lender'

const statusConfig = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Pending Approval' },
  accepted: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Accepted' },
  active: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500 animate-pulse', label: 'In Progress' },
  completed: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', label: 'Completed' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Rejected' },
  cancelled: { bg: 'bg-warm-100', text: 'text-warm-700', border: 'border-warm-200', dot: 'bg-warm-400', label: 'Cancelled' },
}

// Fetch data
async function fetchAllData() {
  loading.value = true
  try {
    const [listingsRes, requestsRes] = await Promise.all([
      api.get('/my-listings'),
      api.get('/rental-requests'),
    ])
    listings.value = listingsRes.data.data || listingsRes.data || []
    rentalRequests.value = requestsRes.data.data || requestsRes.data || []
  } catch (e) {
    console.error('Failed to load profile data:', e)
  } finally {
    loading.value = false
  }
}

// Computed stats
const activeRentalsList = computed(() => {
  return rentalRequests.value.filter(r => ['pending', 'accepted', 'active'].includes(r.status))
})

const historicalRentalsList = computed(() => {
  return rentalRequests.value.filter(r => ['completed', 'cancelled', 'rejected'].includes(r.status))
})

const totalEarned = computed(() => {
  const currentUserId = user.value?.id
  return rentalRequests.value
    .filter(r => r.owner_id === currentUserId && r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
})

const totalSpent = computed(() => {
  const currentUserId = user.value?.id
  return rentalRequests.value
    .filter(r => r.renter_id === currentUserId && r.status === 'completed')
    .reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
})

// Filtered lists for view
const filteredActiveRentals = computed(() => {
  const currentUserId = user.value?.id
  return activeRentalsList.value.filter(r => {
    // Role filter
    if (activeRoleFilter.value === 'renter' && r.renter_id !== currentUserId) return false
    if (activeRoleFilter.value === 'lender' && r.owner_id !== currentUserId) return false
    
    // Status filter
    if (activeSubStatusFilter.value !== 'all' && r.status !== activeSubStatusFilter.value) return false

    return true
  })
})

const filteredHistoryRentals = computed(() => {
  const currentUserId = user.value?.id
  return historicalRentalsList.value.filter(r => {
    // Role filter
    if (historyRoleFilter.value === 'renter' && r.renter_id !== currentUserId) return false
    if (historyRoleFilter.value === 'lender' && r.owner_id !== currentUserId) return false
    
    // Status filter
    if (historyStatusFilter.value !== 'all' && r.status !== historyStatusFilter.value) return false

    return true
  })
})

// Actions
async function handleAction(requestId, actionType) {
  actionLoadingId.value = requestId
  try {
    await api.put(`/rental-requests/${requestId}/${actionType}`)
    await fetchAllData()
  } catch (e) {
    console.error(`Failed to ${actionType} request:`, e)
    alert(e.response?.data?.error || `Failed to ${actionType} request`)
  } finally {
    actionLoadingId.value = null
  }
}

function editListing(id) {
  router.push(`/my-listings/${id}/edit`)
}

async function deleteListing(id) {
  if (!confirm('Are you sure you want to delete this listing?')) return
  deletingListingId.value = id
  try {
    await listingsAPI.delete(id)
    listings.value = listings.value.filter((l) => l.id !== id)
  } catch (e) {
    console.error(e)
    alert('Failed to delete listing.')
  } finally {
    deletingListingId.value = null
  }
}

function openMessage(counterpartId) {
  if (counterpartId) {
    router.push(`/messages/${counterpartId}`)
  }
}

onMounted(() => {
  fetchAllData()
})
</script>

<template>
  <div v-if="user" class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- User Profile Header Card -->
    <div class="bg-white rounded-2xl border border-warm-200 p-6 sm:p-8 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-5">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-md shadow-brand-500/20 shrink-0">
            {{ user.name?.charAt(0).toUpperCase() }}
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-warm-900">{{ user.name }}</h1>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                Verified Member
              </span>
            </div>
            <p class="text-sm text-warm-500">{{ user.email }}</p>
            <div class="flex flex-wrap items-center gap-4 text-xs text-warm-500 pt-1">
              <span v-if="user.phone" class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
                {{ user.phone }}
              </span>
              <span v-if="user.address" class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {{ user.address }}
              </span>
            </div>
          </div>
        </div>

        <RouterLink
          to="/settings"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-xl text-sm font-medium transition-colors self-start md:self-auto"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          Edit Profile
        </RouterLink>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-warm-100">
        <div class="bg-warm-50/60 rounded-xl p-3.5 border border-warm-100">
          <p class="text-xs font-medium text-warm-500">Current Listings</p>
          <p class="text-xl font-bold text-warm-900 mt-1">{{ listings.length }}</p>
        </div>
        <div class="bg-warm-50/60 rounded-xl p-3.5 border border-warm-100">
          <p class="text-xs font-medium text-warm-500">Active Rentals</p>
          <p class="text-xl font-bold text-brand-600 mt-1">{{ activeRentalsList.length }}</p>
        </div>
        <div class="bg-warm-50/60 rounded-xl p-3.5 border border-warm-100">
          <p class="text-xs font-medium text-warm-500">Completed Rentals</p>
          <p class="text-xl font-bold text-warm-900 mt-1">{{ historicalRentalsList.filter(r => r.status === 'completed').length }}</p>
        </div>
        <div class="bg-warm-50/60 rounded-xl p-3.5 border border-warm-100">
          <p class="text-xs font-medium text-warm-500">Total Earnings</p>
          <p class="text-xl font-bold text-emerald-600 mt-1">${{ totalEarned.toFixed(0) }}</p>
        </div>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div class="border-b border-warm-200">
      <nav class="flex gap-6 overflow-x-auto pb-px" aria-label="Tabs">
        <button
          @click="activeTab = 'listings'"
          :class="[
            'py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap',
            activeTab === 'listings'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-warm-500 hover:text-warm-800'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
          Current Listings
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-warm-100 text-warm-700">
            {{ listings.length }}
          </span>
        </button>

        <button
          @click="activeTab = 'active-rentals'"
          :class="[
            'py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap',
            activeTab === 'active-rentals'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-warm-500 hover:text-warm-800'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Active Rentals
          <span
            v-if="activeRentalsList.length"
            class="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700"
          >
            {{ activeRentalsList.length }}
          </span>
        </button>

        <button
          @click="activeTab = 'history'"
          :class="[
            'py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap',
            activeTab === 'history'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-warm-500 hover:text-warm-800'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-3.123-.138A3.001 3.001 0 0 0 12 1.5c-1.28 0-2.378.8-2.801 1.918-1.042.023-2.083.07-3.123.138A2.25 2.25 0 0 0 4.125 5.75v12.75a2.25 2.25 0 0 0 2.25 2.25h11.25Z" />
          </svg>
          Rental History
          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-warm-100 text-warm-700">
            {{ historicalRentalsList.length }}
          </span>
        </button>
      </nav>
    </div>

    <!-- TAB 1: Current Listings -->
    <div v-if="activeTab === 'listings'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-warm-900">Current Listings</h2>
          <p class="text-xs text-warm-500">Manage products and items you have posted for rent</p>
        </div>
        <RouterLink
          to="/create-listing"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create New Listing
        </RouterLink>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="n in 3" :key="n" class="bg-white rounded-2xl border border-warm-200 p-4 animate-pulse">
          <div class="h-44 bg-warm-100 rounded-xl mb-3"></div>
          <div class="h-5 bg-warm-100 rounded-lg w-3/4 mb-2"></div>
          <div class="h-4 bg-warm-100 rounded-lg w-1/2"></div>
        </div>
      </div>

      <!-- Listings Grid -->
      <div v-else-if="listings.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ListingCard
          v-for="l in listings"
          :key="l.id"
          :listing="l"
          manageable
          @edit="editListing"
          @delete="deleteListing"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-warm-200 p-12 text-center">
        <div class="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-warm-900">No active listings</h3>
        <p class="text-sm text-warm-500 mt-1 mb-4 max-w-sm mx-auto">You haven't listed any equipment or items yet. Share your assets and start earning daily rates!</p>
        <RouterLink
          to="/create-listing"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Post a New Listing
        </RouterLink>
      </div>
    </div>

    <!-- TAB 2: Active Rentals -->
    <div v-else-if="activeTab === 'active-rentals'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-warm-900">Active & Ongoing Rentals</h2>
          <p class="text-xs text-warm-500">Track pending requests, accepted rentals, and items currently in progress</p>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Role filter -->
          <div class="inline-flex rounded-lg bg-warm-100 p-1 text-xs font-medium">
            <button
              @click="activeRoleFilter = 'all'"
              :class="['px-3 py-1 rounded-md transition-colors', activeRoleFilter === 'all' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900']"
            >
              All Roles
            </button>
            <button
              @click="activeRoleFilter = 'renter'"
              :class="['px-3 py-1 rounded-md transition-colors', activeRoleFilter === 'renter' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900']"
            >
              Borrowing (Renter)
            </button>
            <button
              @click="activeRoleFilter = 'lender'"
              :class="['px-3 py-1 rounded-md transition-colors', activeRoleFilter === 'lender' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900']"
            >
              Lending (Owner)
            </button>
          </div>

          <!-- Status filter dropdown -->
          <select
            v-model="activeSubStatusFilter"
            class="text-xs bg-white border border-warm-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none text-warm-700"
          >
            <option value="all">All Active Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="accepted">Accepted</option>
            <option value="active">In Progress</option>
          </select>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-4">
        <div v-for="n in 2" :key="n" class="bg-white rounded-2xl border border-warm-200 p-5 animate-pulse">
          <div class="h-6 bg-warm-100 rounded-lg w-1/3 mb-2"></div>
          <div class="h-4 bg-warm-100 rounded-lg w-1/2"></div>
        </div>
      </div>

      <!-- Active Rentals List -->
      <div v-else-if="filteredActiveRentals.length" class="space-y-4">
        <div
          v-for="r in filteredActiveRentals"
          :key="r.id"
          class="bg-white rounded-2xl border border-warm-200 p-5 hover:border-warm-300 transition-all shadow-xs"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-warm-100">
            <!-- Item Info -->
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 rounded-xl bg-warm-100 overflow-hidden shrink-0 border border-warm-200">
                <img
                  v-if="r.listing?.image_url"
                  :src="r.listing.image_url"
                  :alt="r.listing?.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-warm-400">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
                  </svg>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h3
                    class="font-bold text-warm-900 text-base hover:text-brand-600 transition-colors cursor-pointer"
                    @click="router.push(`/listings/${r.listing_id}`)"
                  >
                    {{ r.listing?.title || 'Rental Item' }}
                  </h3>
                  <!-- Role badge -->
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-[11px] font-medium border',
                      r.owner_id === user?.id
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    ]"
                  >
                    {{ r.owner_id === user?.id ? 'Lending (Owner)' : 'Borrowing (Renter)' }}
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-warm-500">
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    {{ r.start_date }} &rarr; {{ r.end_date }} ({{ r.total_days }} days)
                  </span>

                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    {{ r.owner_id === user?.id ? `Renter: ${r.renter?.name || 'User'}` : `Owner: ${r.owner?.name || 'User'}` }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Price & Status Badge -->
            <div class="flex items-center md:flex-col md:items-end justify-between gap-2 shrink-0">
              <div class="text-right">
                <span class="text-lg font-extrabold text-warm-900">${{ Number(r.total_price).toFixed(0) }}</span>
                <span class="text-xs text-warm-400 block">(${{ Number(r.listing?.daily_rate || 0) }}/day)</span>
              </div>

              <div
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold',
                  statusConfig[r.status]?.bg || 'bg-warm-100',
                  statusConfig[r.status]?.text || 'text-warm-700',
                  statusConfig[r.status]?.border || 'border-warm-200'
                ]"
              >
                <span :class="['w-1.5 h-1.5 rounded-full', statusConfig[r.status]?.dot || 'bg-warm-400']"></span>
                {{ statusConfig[r.status]?.label || r.status }}
              </div>
            </div>
          </div>

          <!-- Bottom Action Row -->
          <div class="pt-3 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                @click="openMessage(r.owner_id === user?.id ? r.renter_id : r.owner_id)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-warm-700 bg-warm-100 hover:bg-warm-200 rounded-lg transition-colors"
              >
                <svg class="w-3.5 h-3.5 text-warm-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-.816-.763 6.008 6.008 0 0 1 1.056-2.903C4.28 15.82 3 14.004 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
                Message {{ r.owner_id === user?.id ? 'Renter' : 'Owner' }}
              </button>

              <RouterLink
                :to="`/listings/${r.listing_id}`"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-warm-600 hover:text-warm-900 transition-colors"
              >
                View Listing details &rarr;
              </RouterLink>
            </div>

            <!-- Dynamic Action buttons -->
            <div class="flex items-center gap-2">
              <!-- Pending status actions -->
              <template v-if="r.status === 'pending'">
                <button
                  v-if="r.owner_id === user?.id"
                  @click="handleAction(r.id, 'accept')"
                  :disabled="actionLoadingId === r.id"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Accept Request
                </button>
                <button
                  v-if="r.owner_id === user?.id"
                  @click="handleAction(r.id, 'reject')"
                  :disabled="actionLoadingId === r.id"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                >
                  Decline
                </button>
                <button
                  v-if="r.renter_id === user?.id"
                  @click="handleAction(r.id, 'cancel')"
                  :disabled="actionLoadingId === r.id"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-700 transition-colors"
                >
                  Cancel Request
                </button>
              </template>

              <!-- Accepted status actions -->
              <template v-else-if="r.status === 'accepted'">
                <button
                  @click="handleAction(r.id, 'start')"
                  :disabled="actionLoadingId === r.id"
                  class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                >
                  Start Rental
                </button>
                <button
                  v-if="r.renter_id === user?.id"
                  @click="handleAction(r.id, 'cancel')"
                  :disabled="actionLoadingId === r.id"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-700 transition-colors"
                >
                  Cancel
                </button>
              </template>

              <!-- Active status actions -->
              <template v-else-if="r.status === 'active'">
                <button
                  @click="handleAction(r.id, 'complete')"
                  :disabled="actionLoadingId === r.id"
                  class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                >
                  Mark Complete
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-warm-200 p-12 text-center">
        <div class="w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-warm-900">No active rentals matching filter</h3>
        <p class="text-sm text-warm-500 mt-1 max-w-sm mx-auto">You currently have no pending or ongoing rental agreements under this filter view.</p>
      </div>
    </div>

    <!-- TAB 3: Historical Rental Activity -->
    <div v-else-if="activeTab === 'history'" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-warm-900">Historical Rental Activity</h2>
          <p class="text-xs text-warm-500">Record of all completed, cancelled, and declined rental transactions</p>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Role filter -->
          <div class="inline-flex rounded-lg bg-warm-100 p-1 text-xs font-medium">
            <button
              @click="historyRoleFilter = 'all'"
              :class="['px-3 py-1 rounded-md transition-colors', historyRoleFilter === 'all' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900']"
            >
              All Roles
            </button>
            <button
              @click="historyRoleFilter = 'renter'"
              :class="['px-3 py-1 rounded-md transition-colors', historyRoleFilter === 'renter' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900']"
            >
              As Renter
            </button>
            <button
              @click="historyRoleFilter = 'lender'"
              :class="['px-3 py-1 rounded-md transition-colors', historyRoleFilter === 'lender' ? 'bg-white text-warm-900 shadow-xs font-semibold' : 'text-warm-600 hover:text-warm-900']"
            >
              As Lender
            </button>
          </div>

          <!-- Status filter dropdown -->
          <select
            v-model="historyStatusFilter"
            class="text-xs bg-white border border-warm-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 outline-none text-warm-700"
          >
            <option value="all">All Past Statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Declined/Rejected</option>
          </select>
        </div>
      </div>

      <!-- Financial Summary Banner -->
      <div class="bg-gradient-to-r from-warm-900 to-warm-800 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6 shadow-sm">
        <div>
          <p class="text-xs text-warm-300 font-medium uppercase tracking-wider">Lifetime Rental Summary</p>
          <p class="text-xl font-extrabold mt-0.5">
            {{ historicalRentalsList.filter(r => r.status === 'completed').length }} Completed Transactions
          </p>
        </div>
        <div class="flex items-center gap-8">
          <div>
            <p class="text-xs text-warm-300">Total Earned (Lender)</p>
            <p class="text-lg font-bold text-emerald-400">${{ totalEarned.toFixed(0) }}</p>
          </div>
          <div>
            <p class="text-xs text-warm-300">Total Spent (Renter)</p>
            <p class="text-lg font-bold text-warm-100">${{ totalSpent.toFixed(0) }}</p>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="space-y-3">
        <div v-for="n in 3" :key="n" class="bg-white rounded-2xl border border-warm-200 p-4 animate-pulse">
          <div class="h-5 bg-warm-100 rounded-lg w-1/4 mb-2"></div>
          <div class="h-4 bg-warm-100 rounded-lg w-1/2"></div>
        </div>
      </div>

      <!-- History Activity List -->
      <div v-else-if="filteredHistoryRentals.length" class="space-y-3">
        <div
          v-for="r in filteredHistoryRentals"
          :key="r.id"
          class="bg-white rounded-2xl border border-warm-200 p-4 hover:border-warm-300 transition-all"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl bg-warm-100 overflow-hidden shrink-0 border border-warm-200">
                <img
                  v-if="r.listing?.image_url"
                  :src="r.listing.image_url"
                  :alt="r.listing?.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-warm-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
                  </svg>
                </div>
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-warm-900 text-sm">
                    {{ r.listing?.title || 'Rental Listing' }}
                  </h4>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                      r.owner_id === user?.id
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    ]"
                  >
                    {{ r.owner_id === user?.id ? 'Lender' : 'Renter' }}
                  </span>
                </div>

                <p class="text-xs text-warm-500 mt-0.5">
                  {{ r.start_date }} &rarr; {{ r.end_date }} &middot; {{ r.total_days }} days
                </p>

                <p class="text-xs text-warm-400 mt-0.5">
                  Counterpart: {{ r.owner_id === user?.id ? (r.renter?.name || 'Renter') : (r.owner?.name || 'Owner') }}
                </p>
              </div>
            </div>

            <!-- Price & Status tag & Actions -->
            <div class="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
              <span class="text-base font-extrabold text-warm-900">
                ${{ Number(r.total_price).toFixed(0) }}
              </span>

              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'px-3 py-1 rounded-full border text-xs font-semibold',
                    statusConfig[r.status]?.bg || 'bg-warm-100',
                    statusConfig[r.status]?.text || 'text-warm-700',
                    statusConfig[r.status]?.border || 'border-warm-200'
                  ]"
                >
                  {{ statusConfig[r.status]?.label || r.status }}
                </span>

                <RouterLink
                  v-if="r.status === 'completed' && r.renter_id === user?.id"
                  :to="`/listings/${r.listing_id}`"
                  class="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <svg class="w-3.5 h-3.5 text-amber-500 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Rate & Review
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="bg-white rounded-2xl border border-dashed border-warm-200 p-12 text-center">
        <div class="w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-3.123-.138A3.001 3.001 0 0 0 12 1.5c-1.28 0-2.378.8-2.801 1.918-1.042.023-2.083.07-3.123.138A2.25 2.25 0 0 0 4.125 5.75v12.75a2.25 2.25 0 0 0 2.25 2.25h11.25Z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-warm-900">No historical activity found</h3>
        <p class="text-sm text-warm-500 mt-1 max-w-sm mx-auto">There are no completed or past rental records matching your selected filter criteria.</p>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
    <div class="bg-white rounded-2xl border border-warm-200 p-8 animate-pulse">
      <div class="flex items-center gap-6">
        <div class="w-20 h-20 bg-warm-100 rounded-2xl"></div>
        <div class="space-y-2">
          <div class="h-6 bg-warm-100 rounded-lg w-40"></div>
          <div class="h-4 bg-warm-100 rounded-lg w-56"></div>
        </div>
      </div>
    </div>
  </div>
</template>
