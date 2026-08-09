<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { listingFirstImage } from '../utils/imageUrl'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const activeRoleTab = ref<'borrower' | 'lender'>('borrower')
const statusFilter = ref<string>('all')
const searchQuery = ref<string>('')
const loading = ref<boolean>(true)

const myBorrowings = ref<any[]>([])
const myLendings = ref<any[]>([])

// Review modal state
const showReviewModal = ref<boolean>(false)
const selectedRentalForReview = ref<any | null>(null)
const reviewRating = ref<number>(5)
const reviewComment = ref<string>('')
const submittingReview = ref<boolean>(false)

onMounted(async () => {
  await loadRentals()
})

async function loadRentals() {
  loading.value = true
  try {
    const [borrowRes, lendRes] = await Promise.all([
      api.get('/rentals/mine'),
      api.get('/rentals/lendings')
    ])
    myBorrowings.value = borrowRes.data?.data || borrowRes.data || []
    myLendings.value = lendRes.data?.data || lendRes.data || []
  } catch (err) {
    console.error('Failed to load rentals:', err)
    toast.error('Failed to load rental history')
  } finally {
    loading.value = false
  }
}

// Current dataset based on selected role tab
const currentRentals = computed(() => {
  return activeRoleTab.value === 'borrower' ? myBorrowings.value : myLendings.value
})

// Helper to determine status category (active, upcoming, past, pending, cancelled)
function getRentalCategory(rental: any): 'active' | 'upcoming' | 'past' | 'pending' | 'cancelled' {
  const status = (rental.status || '').toLowerCase()
  if (status === 'cancelled' || status === 'declined' || status === 'rejected') {
    return 'cancelled'
  }
  if (status === 'pending') {
    return 'pending'
  }
  if (status === 'completed' || status === 'returned') {
    return 'past'
  }

  // If status is accepted/approved, evaluate dates relative to today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(rental.start_date || Date.now())
  const end = new Date(rental.end_date || Date.now())

  if (today >= start && today <= end) {
    return 'active'
  } else if (today < start) {
    return 'upcoming'
  } else {
    return 'past'
  }
}

// Stats metrics
const stats = computed(() => {
  const list = currentRentals.value
  let activeCount = 0
  let upcomingCount = 0
  let pastCount = 0
  let totalSpendOrRevenue = 0

  list.forEach((r) => {
    const cat = getRentalCategory(r)
    if (cat === 'active') activeCount++
    if (cat === 'upcoming') upcomingCount++
    if (cat === 'past') pastCount++
    if (r.status === 'accepted' || r.status === 'completed') {
      totalSpendOrRevenue += Number(r.total_price || 0)
    }
  })

  return { activeCount, upcomingCount, pastCount, totalSpendOrRevenue }
})

// Filtered rental items
const filteredRentals = computed(() => {
  return currentRentals.value.filter((rental) => {
    // Status filter
    if (statusFilter.value !== 'all') {
      const cat = getRentalCategory(rental)
      if (statusFilter.value !== cat) return false
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const title = (rental.listing?.title || '').toLowerCase()
      const ownerName = (rental.owner?.name || '').toLowerCase()
      const renterName = (rental.renter?.name || '').toLowerCase()
      return title.includes(q) || ownerName.includes(q) || renterName.includes(q)
    }

    return true
  })
})

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getStatusBadge(rental: any) {
  const cat = getRentalCategory(rental)
  switch (cat) {
    case 'active':
      return { label: '🟢 Currently Active', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    case 'upcoming':
      return { label: '📅 Upcoming', class: 'bg-blue-100 text-blue-800 border-blue-300' }
    case 'pending':
      return { label: '⏳ Awaiting Approval', class: 'bg-amber-100 text-amber-800 border-amber-300' }
    case 'past':
      return { label: '✅ Completed', class: 'bg-warm-200 text-warm-800 border-warm-300' }
    case 'cancelled':
      return { label: '🔴 Cancelled / Declined', class: 'bg-rose-100 text-rose-800 border-rose-300' }
  }
}

// Owner Actions
async function acceptRental(rentalId: number) {
  try {
    await api.put(`/rental-requests/${rentalId}/accept`)
    toast.success('Rental request accepted!')
    await loadRentals()
  } catch (err: any) {
    toast.error('Failed to accept rental')
  }
}

async function declineRental(rentalId: number) {
  try {
    await api.put(`/rental-requests/${rentalId}/decline`)
    toast.success('Rental request declined')
    await loadRentals()
  } catch (err: any) {
    toast.error('Failed to decline rental')
  }
}

async function cancelRental(rentalId: number) {
  if (!confirm('Are you sure you want to cancel this rental request?')) return
  try {
    await api.put(`/rental-requests/${rentalId}/cancel`)
    toast.success('Rental request cancelled')
    await loadRentals()
  } catch (err: any) {
    toast.error('Failed to cancel rental')
  }
}

function openMessageOwnerOrRenter(rental: any) {
  const otherUserId = activeRoleTab.value === 'borrower' ? rental.owner_id : rental.renter_id
  if (otherUserId) {
    router.push(`/messages/${otherUserId}`)
  } else {
    router.push('/messages')
  }
}

function openReviewModal(rental: any) {
  selectedRentalForReview.value = rental
  reviewRating.value = 5
  reviewComment.value = ''
  showReviewModal.value = true
}

async function submitReview() {
  if (!selectedRentalForReview.value) return
  submittingReview.value = true
  try {
    await api.post('/reviews', {
      listing_id: selectedRentalForReview.value.listing_id,
      rating: reviewRating.value,
      comment: reviewComment.value
    })
    toast.success('Review submitted successfully!')
    showReviewModal.value = false
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to submit review')
  } finally {
    submittingReview.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 space-y-6">

    <!-- Header & Role Switcher Tabs -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-warm-200/80 shadow-2xs">
      <div>
        <h1 class="text-2xl font-black text-warm-900 tracking-tight flex items-center gap-2.5">
          <span>📦 My Rental Dashboard</span>
        </h1>
        <p class="text-xs text-warm-500 font-medium mt-1">
          Track active gear borrowings, upcoming equipment reservations, and past community rental history.
        </p>
      </div>

      <!-- Main Role Tabs -->
      <div class="flex items-center bg-warm-100 p-1 rounded-2xl border border-warm-200/80">
        <button
          @click="activeRoleTab = 'borrower'"
          :class="[
            activeRoleTab === 'borrower' ? 'bg-white text-brand-700 shadow-sm font-bold' : 'text-warm-600 hover:text-warm-900 font-semibold',
            'px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer'
          ]"
        >
          <span>🎒 Items I'm Renting</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] bg-brand-100 text-brand-800 font-bold">
            {{ myBorrowings.length }}
          </span>
        </button>

        <button
          @click="activeRoleTab = 'lender'"
          :class="[
            activeRoleTab === 'lender' ? 'bg-white text-brand-700 shadow-sm font-bold' : 'text-warm-600 hover:text-warm-900 font-semibold',
            'px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer'
          ]"
        >
          <span>🏷️ Items I'm Lending</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] bg-brand-100 text-brand-800 font-bold">
            {{ myLendings.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 bg-white rounded-2xl border border-warm-200/80 shadow-2xs flex items-center gap-3">
        <div class="p-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-lg">🟢</div>
        <div>
          <p class="text-[11px] font-bold text-warm-400 uppercase tracking-wider">Active Now</p>
          <p class="text-xl font-black text-warm-900">{{ stats.activeCount }}</p>
        </div>
      </div>

      <div class="p-4 bg-white rounded-2xl border border-warm-200/80 shadow-2xs flex items-center gap-3">
        <div class="p-3 bg-blue-100 text-blue-700 rounded-xl font-bold text-lg">📅</div>
        <div>
          <p class="text-[11px] font-bold text-warm-400 uppercase tracking-wider">Upcoming</p>
          <p class="text-xl font-black text-warm-900">{{ stats.upcomingCount }}</p>
        </div>
      </div>

      <div class="p-4 bg-white rounded-2xl border border-warm-200/80 shadow-2xs flex items-center gap-3">
        <div class="p-3 bg-warm-100 text-warm-700 rounded-xl font-bold text-lg">✅</div>
        <div>
          <p class="text-[11px] font-bold text-warm-400 uppercase tracking-wider">Completed</p>
          <p class="text-xl font-black text-warm-900">{{ stats.pastCount }}</p>
        </div>
      </div>

      <div class="p-4 bg-white rounded-2xl border border-warm-200/80 shadow-2xs flex items-center gap-3">
        <div class="p-3 bg-brand-100 text-brand-700 rounded-xl font-bold text-lg">💵</div>
        <div>
          <p class="text-[11px] font-bold text-warm-400 uppercase tracking-wider">
            {{ activeRoleTab === 'borrower' ? 'Total Spent' : 'Total Revenue' }}
          </p>
          <p class="text-xl font-black text-warm-900">${{ stats.totalSpendOrRevenue.toFixed(0) }}</p>
        </div>
      </div>
    </div>

    <!-- Filters & Search Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-warm-200/80 shadow-2xs">

      <!-- Status Pills -->
      <div class="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <button
          @click="statusFilter = 'all'"
          :class="[statusFilter === 'all' ? 'bg-warm-900 text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200', 'px-3 py-1.5 rounded-xl transition-all']"
        >
          All
        </button>
        <button
          @click="statusFilter = 'active'"
          :class="[statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200', 'px-3 py-1.5 rounded-xl transition-all']"
        >
          Active
        </button>
        <button
          @click="statusFilter = 'upcoming'"
          :class="[statusFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200', 'px-3 py-1.5 rounded-xl transition-all']"
        >
          Upcoming
        </button>
        <button
          @click="statusFilter = 'pending'"
          :class="[statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200', 'px-3 py-1.5 rounded-xl transition-all']"
        >
          Pending
        </button>
        <button
          @click="statusFilter = 'past'"
          :class="[statusFilter === 'past' ? 'bg-warm-700 text-white' : 'bg-warm-100 text-warm-700 hover:bg-warm-200', 'px-3 py-1.5 rounded-xl transition-all']"
        >
          Completed
        </button>
      </div>

      <!-- Search Box -->
      <div class="relative min-w-[240px]">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by item name or user..."
          class="w-full pl-9 pr-4 py-2 text-xs font-medium bg-warm-50 border border-warm-200 rounded-xl text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <svg class="w-4 h-4 text-warm-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
    </div>

    <!-- Rentals List Area -->
    <div v-if="loading" class="py-16 text-center bg-white rounded-3xl border border-warm-200">
      <div class="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-warm-500 font-semibold mt-3">Loading your rental records...</p>
    </div>

    <div v-else-if="filteredRentals.length === 0" class="py-16 text-center bg-white rounded-3xl border border-warm-200 p-8 space-y-3">
      <div class="text-4xl">📦</div>
      <h3 class="font-bold text-warm-900 text-base">No rentals found</h3>
      <p class="text-xs text-warm-500 max-w-md mx-auto">
        You don't have any {{ statusFilter !== 'all' ? statusFilter : '' }} rental requests in this view yet. Browse community equipment or list your own gear!
      </p>
      <router-link
        to="/listings"
        class="inline-block px-5 py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl hover:bg-brand-600 transition-all shadow-md"
      >
        Explore Rental Items
      </router-link>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="rental in filteredRentals"
        :key="rental.id"
        class="bg-white rounded-3xl border border-warm-200/90 shadow-sm p-5 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
      >
        <!-- Left: Item Info & Image -->
        <div class="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <img
            v-if="listingFirstImage(rental.listing)"
            :src="listingFirstImage(rental.listing)"
            :alt="rental.listing?.title"
            class="w-20 h-20 rounded-2xl object-cover bg-warm-100 border border-warm-200 shrink-0"
          />
          <div v-else class="w-20 h-20 rounded-2xl bg-warm-100 border border-warm-200 flex items-center justify-center text-warm-300 text-2xl shrink-0">
            📦
          </div>

          <div class="flex-1 min-w-0 space-y-1">
            <!-- Status Badge & ID -->
            <div class="flex items-center gap-2 flex-wrap">
              <span :class="[getStatusBadge(rental).class, 'px-2.5 py-0.5 rounded-full text-[11px] font-bold border']">
                {{ getStatusBadge(rental).label }}
              </span>
              <span class="text-[11px] font-mono text-warm-400">
                #RENT-{{ rental.id }}
              </span>
            </div>

            <!-- Title -->
            <h3 class="font-bold text-warm-900 text-base truncate hover:text-brand-600 cursor-pointer" @click="router.push(`/listings/${rental.listing_id}`)">
              {{ rental.listing?.title || 'Rental Item' }}
            </h3>

            <!-- User Contact snapshot -->
            <div class="flex items-center gap-2 text-xs text-warm-600 font-medium">
              <span class="text-warm-400">
                {{ activeRoleTab === 'borrower' ? 'Owner:' : 'Renter:' }}
              </span>
              <span class="font-bold text-warm-900">
                {{ activeRoleTab === 'borrower' ? (rental.owner?.name || 'Item Owner') : (rental.renter?.name || 'Community Renter') }}
              </span>
              <button
                @click="openMessageOwnerOrRenter(rental)"
                class="ml-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md hover:bg-brand-100 transition-colors"
              >
                💬 Chat
              </button>
            </div>
          </div>
        </div>

        <!-- Middle: Dates & Price Breakdown -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-6 bg-warm-50/80 p-3.5 rounded-2xl border border-warm-200/70 text-xs">
          <!-- Dates -->
          <div class="space-y-0.5">
            <span class="block text-[10px] font-bold text-warm-400 uppercase tracking-wider">Rental Duration</span>
            <div class="font-bold text-warm-900 flex items-center gap-1.5">
              <span>{{ formatDisplayDate(rental.start_date) }}</span>
              <span class="text-warm-400">&rarr;</span>
              <span>{{ formatDisplayDate(rental.end_date) }}</span>
            </div>
            <span class="block text-[11px] text-brand-700 font-extrabold">
              {{ rental.total_days || 1 }} {{ rental.total_days === 1 ? 'day' : 'days' }} total
            </span>
          </div>

          <div class="h-8 w-px bg-warm-200 hidden sm:block"></div>

          <!-- Total Price & Payment Method -->
          <div class="space-y-0.5">
            <span class="block text-[10px] font-bold text-warm-400 uppercase tracking-wider">Payment & Total</span>
            <div class="font-black text-warm-900 text-sm flex items-center gap-1.5">
              <span>${{ Number(rental.total_price || 0).toFixed(2) }}</span>
              <span
                class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                :class="rental.payment_method === 'cash' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-brand-50 text-brand-800 border-brand-200'"
              >
                {{ rental.payment_method === 'express' ? ' Pay' : rental.payment_method === 'p2p' ? '📱 Venmo' : rental.payment_method === 'cash' ? '🤝 Cash' : `💳 Card (•••• ${rental.card_last_four || '4242'})` }}
              </span>
            </div>
            <span class="block text-[10px] text-warm-500 font-medium">
              Deposit: ${{ Number(rental.security_deposit || 0).toFixed(0) }}
            </span>
          </div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Borrowers Pending Actions -->
          <button
            v-if="activeRoleTab === 'borrower' && rental.status === 'pending'"
            @click="cancelRental(rental.id)"
            class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
          >
            Cancel Request
          </button>

          <!-- Owner Pending Actions -->
          <div v-if="activeRoleTab === 'lender' && rental.status === 'pending'" class="flex items-center gap-2">
            <button
              @click="acceptRental(rental.id)"
              class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Accept
            </button>
            <button
              @click="declineRental(rental.id)"
              class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
            >
              Decline
            </button>
          </div>

          <!-- Completed Actions -->
          <button
            v-if="getRentalCategory(rental) === 'past' && activeRoleTab === 'borrower'"
            @click="openReviewModal(rental)"
            class="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>⭐ Leave Review</span>
          </button>

          <!-- View Item Link -->
          <router-link
            :to="`/listings/${rental.listing_id}`"
            class="px-3.5 py-2 bg-warm-100 hover:bg-warm-200 text-warm-800 font-bold text-xs rounded-xl transition-all"
          >
            View Listing
          </router-link>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <Transition name="fade">
      <div
        v-if="showReviewModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-900/60 backdrop-blur-sm"
        @click.self="showReviewModal = false"
      >
        <div class="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-md w-full p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-warm-100 pb-3">
            <h3 class="font-bold text-warm-900 text-base">Rate Your Rental Experience</h3>
            <button @click="showReviewModal = false" class="text-warm-400 hover:text-warm-700 text-sm">✕</button>
          </div>

          <p class="text-xs text-warm-500">
            Share your feedback for <strong>{{ selectedRentalForReview?.listing?.title }}</strong>
          </p>

          <!-- Star Selector -->
          <div class="flex items-center gap-2 justify-center py-2">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              @click="reviewRating = star"
              class="text-3xl focus:outline-none transition-transform hover:scale-125 cursor-pointer"
            >
              <span v-if="star <= reviewRating" class="text-amber-400">★</span>
              <span v-else class="text-warm-200">★</span>
            </button>
          </div>

          <!-- Review Comment -->
          <div>
            <label class="block text-xs font-bold text-warm-700 mb-1">Your Review</label>
            <textarea
              v-model="reviewComment"
              rows="3"
              placeholder="How was the equipment condition and owner communication?"
              class="w-full px-3 py-2 rounded-xl border border-warm-200 text-xs text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              @click="showReviewModal = false"
              class="px-4 py-2 rounded-xl text-xs font-bold text-warm-600 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              @click="submitReview"
              :disabled="submittingReview"
              class="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>
