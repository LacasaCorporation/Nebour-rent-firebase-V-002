<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api, { listingsAPI, availabilityAPI } from '../services/api.js'
import { useAuthStore } from '../stores/auth.js'
import { useFavoritesStore } from '../stores/favorites.js'
import { listingFirstImage, listingImageUrl, listingAllImages } from '../utils/imageUrl'
import ImageGallery from '../components/ImageGallery.vue'
import NeighborhoodRentalMap from '../components/NeighborhoodRentalMap.vue'
import ContactOwnerModal from '../components/ContactOwnerModal.vue'
import CalendarPicker from '../components/CalendarPicker.vue'
import PaymentMethodSelector from '../components/PaymentMethodSelector.vue'
import PriceComparisonWidget from '../components/PriceComparisonWidget.vue'
import CompareModal from '../components/CompareModal.vue'
import Modal from '../components/Modal.vue'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const favoritesStore = useFavoritesStore()
const toast = useToast()

// Compare modal
const showCompareModal = ref(false)
const compareListingIds = ref([])

function openCompareModal(ids) {
  compareListingIds.value = ids
  showCompareModal.value = true
}

function handleRemoveCompareItem(id) {
  compareListingIds.value = compareListingIds.value.filter(i => i !== id)
  if (!compareListingIds.value.length) {
    showCompareModal.value = false
  }
}

const listing = ref(null)
const loading = ref(true)
const categories = ref([])
const availability = ref(null)
const showContactOwnerModal = ref(false)

// Reviews
const showReviewModal = ref(false)
const reviewRating = ref(5)
const reviewHoverRating = ref(0)
const reviewComment = ref('')
const reviewSubmitting = ref(false)

const ratingLabels = {
  1: 'Poor - Not as described',
  2: 'Fair - Had some issues',
  3: 'Good - Met expectations',
  4: 'Very Good - Recommended',
  5: 'Excellent - Exceptional item & owner'
}

async function submitReview() {
  if (!reviewRating.value) {
    toast.error('Please select a star rating')
    return
  }
  reviewSubmitting.value = true
  try {
    await api.post('/reviews', {
      listing_id: listing.value.id,
      rating: reviewRating.value,
      comment: reviewComment.value,
    })
    toast.success('Thank you for your review!')
    showReviewModal.value = false
    reviewComment.value = ''
    reviewRating.value = 5
    reviewHoverRating.value = 0
    const res = await api.get(`/listings/${listing.value.id}`)
    listing.value = res.data.data || res.data
  } catch (e) {
    toast.error(e.response?.data?.message || e.response?.data?.error || 'Failed to submit review')
  } finally {
    reviewSubmitting.value = false
  }
}

// Rental modal
const showRentModal = ref(false)
const rentalDates = ref({})
const rentalStartDate = ref('')
const rentalEndDate = ref('')
const rentalMessage = ref('')
const selectedPaymentMethod = ref('card')
const selectedInsuranceTier = ref('peace_of_mind')
const cardDetails = ref({ cardNumber: '', expiry: '', cvv: '', cardLastFour: '4242' })
const submitting = ref(false)

const blockedDates = computed(() => availability.value?.unavailable_dates || [])

const rentalTotalDays = computed(() => {
  if (!rentalStartDate.value || !rentalEndDate.value) return 1
  const s = new Date(rentalStartDate.value)
  const e = new Date(rentalEndDate.value)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  const diff = Math.abs(e.getTime() - s.getTime())
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

const calculatedInsuranceFee = computed(() => {
  const perDay = selectedInsuranceTier.value === 'peace_of_mind' ? 5 : selectedInsuranceTier.value === 'all_risk' ? 10 : 0
  return perDay * rentalTotalDays.value
})

watch(rentalDates, (val) => {
  rentalStartDate.value = val?.start || ''
  rentalEndDate.value = val?.end || ''
})

// Owner CRUD
const isOwner = computed(() => {
  return authStore.isAuthenticated && authStore.currentUser.value?.id && listing.value?.user?.id === authStore.currentUser.value?.id
})

// Edit modal
const showEditModal = ref(false)
const editForm = ref({ title: '', description: '', daily_rate: '', weekly_rate: '', monthly_rate: '', security_deposit: '', location: '', category_id: '', available_from: '', available_to: '' })
const editImageFile = ref(null)
const editSubmitting = ref(false)
const editErrors = ref({})

// Delete modal
const showDeleteModal = ref(false)
const deleteSubmitting = ref(false)

async function loadAvailability() {
  try {
    const res = await availabilityAPI.get(route.params.id)
    availability.value = res.data.data || res.data
  } catch {
    availability.value = null
  }
}

function onToggleDate({ date, block }) {
  toggleBlockDate(date, !block)
}

async function toggleBlockDate(date, currentlyBlocked) {
  try {
    if (currentlyBlocked) {
      await availabilityAPI.unblockDate(route.params.id, date)
    } else {
      await availabilityAPI.blockDates(route.params.id, [date])
    }
    await loadAvailability()
  } catch (e) {
    toast.error(e.response?.data?.message || 'Failed to update availability')
  }
}

onMounted(async () => {
  await authStore.authReady
  if (route.query.start_date) {
    rentalStartDate.value = String(route.query.start_date)
  }
  if (route.query.end_date) {
    rentalEndDate.value = String(route.query.end_date)
  }
  if (route.query.start_date || route.query.end_date) {
    rentalDates.value = {
      start: route.query.start_date ? String(route.query.start_date) : null,
      end: route.query.end_date ? String(route.query.end_date) : null
    }
  }

  try {
    const [listingRes, catsRes] = await Promise.all([
      api.get(`/listings/${route.params.id}`),
      api.get('/categories').catch(() => ({ data: { data: [] } })),
    ])
    listing.value = listingRes.data.data || listingRes.data
    categories.value = catsRes.data?.data || catsRes.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
  loadAvailability()
})

async function submitRental() {
  submitting.value = true
  try {
    await api.post('/rental-requests', {
      listing_id: listing.value.id,
      start_date: rentalStartDate.value,
      end_date: rentalEndDate.value,
      message: rentalMessage.value || null,
      payment_method: selectedPaymentMethod.value,
      card_last_four: cardDetails.value?.cardLastFour || '4242',
      insurance_plan: selectedInsuranceTier.value,
      insurance_fee: calculatedInsuranceFee.value
    })
    showRentModal.value = false
    rentalStartDate.value = ''
    rentalEndDate.value = ''
    rentalMessage.value = ''
    toast.success('Rental request & protection tier confirmed!')
  } catch (e) {
    toast.error(e.response?.data?.message || 'Failed to submit request')
  } finally {
    submitting.value = false
  }
}

// --- Owner CRUD ---

function openEditModal() {
  editForm.value = {
    title: listing.value.title || '',
    description: listing.value.description || '',
    daily_rate: listing.value.daily_rate || '',
    weekly_rate: listing.value.weekly_rate || '',
    monthly_rate: listing.value.monthly_rate || '',
    security_deposit: listing.value.security_deposit || '',
    location: listing.value.location || '',
    category_id: listing.value.category_id || '',
    available_from: listing.value.available_from || '',
    available_to: listing.value.available_to || '',
  }
  editImageFile.value = null
  editErrors.value = {}
  showEditModal.value = true
}

function handleEditImage(e) {
  editImageFile.value = e.target.files[0]
}

async function submitEdit() {
  editSubmitting.value = true
  editErrors.value = {}
  try {
    const fd = new FormData()
    Object.entries(editForm.value).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) fd.append(key, val)
    })
    fd.append('_method', 'PUT')
    if (editImageFile.value) fd.append('image', editImageFile.value)
    const { data } = await api.post(`/listings/${listing.value.id}`, fd, {
      headers: { 'Content-Type': undefined },
    })
    listing.value = data.data || data
    showEditModal.value = false
  } catch (e) {
    if (e.response?.status === 422) {
      editErrors.value = e.response.data.errors || {}
    } else {
      toast.error(e.response?.data?.message || 'Failed to update listing')
    }
  } finally {
    editSubmitting.value = false
  }
}

async function confirmDelete() {
  deleteSubmitting.value = true
  try {
    await listingsAPI.delete(listing.value.id)
    router.push('/listings')
  } catch (e) {
    toast.error(e.response?.data?.message || 'Failed to delete listing')
  } finally {
    deleteSubmitting.value = false
    showDeleteModal.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="max-w-6xl mx-auto px-6 py-10 space-y-6">
    <div class="h-8 w-48 bg-warm-100 rounded-lg animate-pulse"></div>
    <div class="h-80 bg-warm-100 rounded-2xl animate-pulse"></div>
    <div class="h-32 bg-warm-100 rounded-2xl animate-pulse"></div>
  </div>

  <div v-else-if="listing" class="max-w-6xl mx-auto px-6 py-10 space-y-6">
    <!-- Back -->
    <button
      @click="router.back()"
      class="flex items-center gap-2 text-sm text-warm-500 hover:text-brand-500 transition-colors font-medium"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back to listings
    </button>

    <div class="grid grid-cols-5 gap-8">
      <!-- Image Column -->
      <div class="col-span-3 space-y-6">
        <ImageGallery :images="listingAllImages(listing)" />
        
        <!-- Neighborhood Price Comparison & Benchmarks -->
        <PriceComparisonWidget
          v-if="listing?.id"
          :listing-id="listing.id"
          :current-listing="listing"
          @open-compare="openCompareModal"
        />
      </div>

      <!-- Info Column -->
      <div class="col-span-2 space-y-5">
        <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-6">
          <div class="flex items-center justify-between mb-3 gap-2">
            <!-- Status Indicator -->
            <span
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs"
              :class="listing.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (listing.status === 'rented' || listing.status === 'currently rented' || listing.status === 'unavailable') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
            >
              <span :class="['w-2 h-2 rounded-full', listing.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500']"></span>
              <span>{{ listing.status === 'available' ? 'Available to Rent' : (listing.status === 'rented' || listing.status === 'currently rented' || listing.status === 'unavailable') ? 'Currently Rented' : 'Maintenance' }}</span>
            </span>

            <!-- Save to Wishlist Button -->
            <button
              @click="favoritesStore.toggleFavorite(listing.id)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-warm-200/80 hover:border-rose-300 bg-white hover:bg-rose-50 text-warm-700 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            >
              <svg
                :class="['w-4 h-4 transition-colors', favoritesStore.isFavorited(listing.id) ? 'text-rose-500 fill-rose-500' : 'text-warm-400 group-hover:text-rose-500']"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
              <span>{{ favoritesStore.isFavorited(listing.id) ? 'Saved in Wishlist' : 'Save to Wishlist' }}</span>
            </button>
          </div>
          <h1 class="text-2xl font-bold text-warm-900 mb-2">{{ listing.title }}</h1>
          <p class="text-sm text-warm-500 leading-relaxed">{{ listing.description }}</p>
        </div>

        <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <svg class="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659 1.171-1.671M12 18.818l-1.171-1.671 1.171-.659m0 0a3 3 0 1 0 4.243 4.243 3 3 0 0 0-4.243-4.243Z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-warm-500">Daily Rate</p>
              <p class="text-xl font-bold text-brand-600">${{ listing.daily_rate }}<span class="text-sm font-normal text-warm-500">/day</span></p>
            </div>
          </div>

          <div class="h-px bg-warm-200"></div>

          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-warm-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-warm-500">Location</p>
              <p class="text-sm font-medium text-warm-800">{{ listing.location }}</p>
            </div>
          </div>

          <div v-if="listing.category" class="h-px bg-warm-200"></div>

          <div v-if="listing.category" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-warm-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-warm-500">Category</p>
              <p class="text-sm font-medium text-warm-800 capitalize">{{ listing.category?.name || listing.category }}</p>
            </div>
          </div>

          <div v-if="listing.company" class="h-px bg-warm-200"></div>

          <RouterLink
            v-if="listing.company"
            :to="`/companies/${listing.company.slug}`"
            class="group flex items-center gap-3 rounded-xl p-2 -m-2 hover:bg-warm-50 transition-colors"
          >
            <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-base font-bold text-brand-600 shrink-0">
              {{ (listing.company.name || 'C')[0].toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-xs text-warm-500">Company</p>
              <p class="text-sm font-semibold text-warm-800 truncate group-hover:text-brand-600 transition-colors">
                {{ listing.company.name }}
                <svg class="w-3.5 h-3.5 inline-block text-warm-400 group-hover:text-brand-500 transition-colors -mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </p>
              <p v-if="listing.company.is_verified" class="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" />
                </svg>
                Verified
              </p>
            </div>
          </RouterLink>
        </div>

        <!-- Neighborhood Location Map -->
        <div v-if="listing" class="mt-4">
          <NeighborhoodRentalMap :listings="[listing]" />
        </div>

        <!-- Availability -->
        <div v-if="availability" class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-6 space-y-3">
          <h3 class="text-sm font-semibold text-warm-900 uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            Availability
          </h3>
          <div v-if="availability.available_from || availability.available_to" class="flex items-center gap-3 text-sm">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-warm-500">Available</p>
              <p class="font-medium text-warm-800">
                {{ availability.available_from ? new Date(availability.available_from).toLocaleDateString() : 'Anytime' }}
                <span v-if="availability.available_from && availability.available_to"> — </span>
                {{ availability.available_to ? new Date(availability.available_to).toLocaleDateString() : (availability.available_from ? 'Forever' : '') }}
              </p>
            </div>
          </div>

          <CalendarPicker
            :blocked-dates="blockedDates"
            :interactive="isOwner"
            @toggle-date="onToggleDate"
          />
        </div>

        <!-- Rental Agreement -->
        <div
          v-if="listing.agreement_document || listing.agreement_text"
          class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-6 space-y-3"
        >
          <h3 class="text-sm font-semibold text-warm-900 uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            Rental Agreement
          </h3>

          <a
            v-if="listing.agreement_document"
            :href="listingImageUrl(listing.agreement_document, '')"
            target="_blank"
            class="flex items-center justify-between gap-3 rounded-xl bg-warm-100 border border-warm-200 px-4 py-3 hover:border-brand-300 hover:bg-brand-50 transition-colors group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-warm-800 truncate">{{ listing.agreement_document.split('/').pop() }}</p>
                <p class="text-xs text-warm-500">View agreement document</p>
              </div>
            </div>
            <svg class="w-5 h-5 text-warm-400 group-hover:text-brand-500 transition-colors shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>

          <div v-if="listing.agreement_text" class="rounded-xl border border-warm-200 bg-warm-50/50 px-4 py-3">
            <p class="text-xs font-medium text-warm-500 uppercase tracking-wider mb-2">Agreement Terms</p>
            <p class="text-sm text-warm-700 leading-relaxed whitespace-pre-wrap">{{ listing.agreement_text }}</p>
          </div>
        </div>

        <!-- Direct Contact Owner Card -->
        <div v-if="!isOwner" class="bg-white/80 backdrop-blur-sm rounded-2xl border border-warm-200/90 p-5 space-y-3.5 shadow-2xs">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                {{ ((listing.company?.name || listing.owner_name || listing.user?.name || 'Owner')[0]).toUpperCase() }}
              </div>
              <div>
                <p class="text-xs font-semibold text-warm-400 uppercase tracking-wider">Item Owner</p>
                <h4 class="font-bold text-warm-900 text-sm">
                  {{ listing.company?.name || listing.owner_name || listing.user?.name || 'Verified Neighbor' }}
                </h4>
              </div>
            </div>
            <span class="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active
            </span>
          </div>

          <!-- Contact Owner Button -->
          <button
            @click="showContactOwnerModal = true"
            class="w-full py-3 rounded-xl bg-warm-100 hover:bg-brand-50 text-warm-900 hover:text-brand-700 border border-warm-200/80 hover:border-brand-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A2.625 2.625 0 0 1 6.375 2.25h11.25A2.625 2.625 0 0 1 20.25 4.875v10.5A2.625 2.625 0 0 1 17.625 18H7.5l-3.75 2.105Z" />
            </svg>
            <span>Message Owner Directly</span>
          </button>
        </div>

        <!-- Action -->
        <button
          v-if="authStore.isAuthenticated && listing.status === 'available' && authStore.currentUser.value?.id !== listing.user_id"
          @click="showRentModal = true"
          class="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:shadow-xl hover:shadow-brand-500/25 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Request to Rent
        </button>
        <RouterLink
          v-else-if="!authStore.isAuthenticated"
          to="/login"
          class="block w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold text-center hover:shadow-xl hover:shadow-brand-500/25 hover:-translate-y-0.5 transition-all duration-200"
        >
          Sign in to Rent
        </RouterLink>

        <!-- Owner controls -->
        <div v-else-if="isOwner" class="space-y-3">
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p class="text-sm font-semibold text-amber-700">You own this listing</p>
          </div>
          <button
            @click="router.push(`/my-listings/${listing.id}/edit`)"
            class="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:shadow-xl hover:shadow-brand-500/25 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            Edit Listing
          </button>
          <button
            @click="showDeleteModal = true"
            class="w-full py-3.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 hover:border-red-300 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete Listing
          </button>
        </div>
      </div>
    </div>

    <!-- Reviews Section -->
    <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-6 space-y-6">
      <div class="flex items-center justify-between border-b border-warm-100 pb-4">
        <div>
          <h2 class="text-xl font-bold text-warm-900 flex items-center gap-2">
            Neighbor Reviews & Ratings
            <span v-if="listing.reviews?.length" class="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-warm-100 text-warm-700">
              {{ listing.reviews.length }}
            </span>
          </h2>
          <p class="text-xs text-warm-500 mt-0.5">Authentic community feedback from verified rental experiences</p>
        </div>
        <button
          v-if="authStore.isAuthenticated && authStore.currentUser.value?.id !== listing.user_id"
          @click="showReviewModal = true"
          class="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-semibold rounded-xl border border-brand-200 transition-colors flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Write a Review
        </button>
      </div>

      <!-- Rating Breakdown Card -->
      <div v-if="listing.reviews?.length" class="bg-warm-50/70 rounded-xl p-5 border border-warm-200/80 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <!-- Average Score Box -->
        <div class="text-center md:border-r border-warm-200/80 md:pr-6">
          <div class="text-4xl font-extrabold text-warm-900 tracking-tight">
            {{ Number(listing.rating || 5.0).toFixed(1) }}
          </div>
          <div class="flex items-center justify-center gap-1 my-1.5">
            <svg
              v-for="n in 5"
              :key="n"
              class="w-5 h-5"
              :class="n <= Math.round(listing.rating || 5) ? 'fill-amber-400 text-amber-400' : 'fill-warm-200 text-warm-200'"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <p class="text-xs font-medium text-warm-500">Based on {{ listing.reviews.length }} {{ listing.reviews.length === 1 ? 'review' : 'reviews' }}</p>
        </div>

        <!-- Rating Progress Bars -->
        <div class="col-span-2 space-y-2">
          <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center gap-3 text-xs text-warm-600">
            <span class="w-12 font-semibold text-right flex items-center justify-end gap-1">
              {{ star }} <span class="text-amber-400">★</span>
            </span>
            <div class="flex-1 h-2 rounded-full bg-warm-200 overflow-hidden">
              <div
                class="h-full bg-amber-400 rounded-full transition-all duration-300"
                :style="{ width: `${listing.rating_breakdown && listing.reviews.length ? ((listing.rating_breakdown[star] || 0) / listing.reviews.length) * 100 : (star === 5 ? 100 : 0)}%` }"
              ></div>
            </div>
            <span class="w-8 text-warm-400 font-mono text-[11px]">
              {{ listing.rating_breakdown ? (listing.rating_breakdown[star] || 0) : (star === 5 ? listing.reviews.length : 0) }}
            </span>
          </div>
        </div>
      </div>

      <!-- No Reviews State -->
      <div v-if="!listing.reviews?.length" class="text-center py-10">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-warm-800 mb-1">No reviews yet</h3>
        <p class="text-sm text-warm-500 max-w-sm mx-auto">Be the first neighbor to review this item after renting!</p>
      </div>

      <!-- Reviews List -->
      <div v-else class="space-y-4 pt-2">
        <div
          v-for="review in listing.reviews"
          :key="review.id"
          class="bg-white rounded-xl p-4 border border-warm-100 shadow-sm space-y-2.5"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {{ (review.reviewer?.name || 'A')[0].toUpperCase() }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-bold text-warm-900">{{ review.reviewer?.name || 'Community Member' }}</p>
                  <span v-if="review.is_verified_rental" class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <svg class="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                    Verified Renter
                  </span>
                </div>
                <p class="text-[11px] text-warm-400">{{ new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}</p>
              </div>
            </div>

            <!-- Star Rating -->
            <div class="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              <svg
                v-for="n in 5"
                :key="n"
                class="w-3.5 h-3.5"
                :class="n <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-warm-200 text-warm-200'"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          <p v-if="review.comment" class="text-sm text-warm-700 leading-relaxed pl-12">
            "{{ review.comment }}"
          </p>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showRentModal"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          @click.self="showRentModal = false"
        >
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between border-b border-warm-100 pb-3">
              <div>
                <h3 class="text-lg font-bold text-warm-900">Request & Pay for Rental</h3>
                <p class="text-xs text-warm-500">Select dates and choose your payment method</p>
              </div>
              <button @click="showRentModal = false" class="text-warm-400 hover:text-warm-700 cursor-pointer">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Calendar Picker -->
            <CalendarPicker
              v-model="rentalDates"
              :blocked-dates="blockedDates"
            />

            <!-- Protection & Damage Deposit Tier Options -->
            <div class="space-y-2 bg-warm-50/70 p-3.5 rounded-2xl border border-warm-200">
              <label class="block text-xs font-bold text-warm-800 uppercase tracking-wider flex items-center justify-between">
                <span>🛡️ Protection & Security Deposit Tier</span>
                <span class="text-[10px] text-emerald-600 font-bold" v-if="calculatedInsuranceFee > 0">+${{ calculatedInsuranceFee }} Insurance</span>
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <!-- Tier 1: Standard Hold -->
                <button
                  type="button"
                  @click="selectedInsuranceTier = 'basic'"
                  :class="selectedInsuranceTier === 'basic' ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-400' : 'border-warm-200 bg-white hover:bg-warm-100/50'"
                  class="p-2.5 rounded-xl border text-left transition-all relative cursor-pointer"
                >
                  <div class="text-[11px] font-bold text-warm-900">Standard Hold</div>
                  <p class="text-[10px] text-warm-500 mt-0.5">$0/day protection</p>
                  <p class="text-[10px] font-bold text-amber-700 mt-1">${{ listing?.security_deposit || 0 }} deposit hold</p>
                </button>

                <!-- Tier 2: Peace of Mind ($5/day) -->
                <button
                  type="button"
                  @click="selectedInsuranceTier = 'peace_of_mind'"
                  :class="selectedInsuranceTier === 'peace_of_mind' ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-400' : 'border-warm-200 bg-white hover:bg-warm-100/50'"
                  class="p-2.5 rounded-xl border text-left transition-all relative cursor-pointer"
                >
                  <span class="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-extrabold rounded-full shadow-xs">POPULAR</span>
                  <div class="text-[11px] font-bold text-warm-900">Peace of Mind</div>
                  <p class="text-[10px] text-emerald-600 font-bold mt-0.5">+$5/day waiver</p>
                  <p class="text-[10px] text-warm-500 mt-1">Covers minor damage</p>
                </button>

                <!-- Tier 3: Zero Liability ($10/day) -->
                <button
                  type="button"
                  @click="selectedInsuranceTier = 'all_risk'"
                  :class="selectedInsuranceTier === 'all_risk' ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-400' : 'border-warm-200 bg-white hover:bg-warm-100/50'"
                  class="p-2.5 rounded-xl border text-left transition-all relative cursor-pointer"
                >
                  <div class="text-[11px] font-bold text-warm-900">Zero Liability</div>
                  <p class="text-[10px] text-brand-600 font-bold mt-0.5">+$10/day protection</p>
                  <p class="text-[10px] text-warm-500 mt-1">All-risk covered</p>
                </button>
              </div>
            </div>

            <!-- Payment Method Selector -->
            <PaymentMethodSelector
              v-model="selectedPaymentMethod"
              :daily-rate="listing?.daily_rate"
              :security-deposit="listing?.security_deposit"
              :total-days="rentalTotalDays"
              @update:card-details="c => cardDetails = c"
            />

            <!-- Message to owner -->
            <div>
              <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider mb-1">Message to Owner (Optional)</label>
              <textarea
                v-model="rentalMessage"
                rows="2"
                class="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 text-xs text-warm-800 placeholder-warm-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
                placeholder="Tell the owner why you'd like to rent this item..."
              ></textarea>
            </div>

            <div class="flex gap-3 pt-2 border-t border-warm-100">
              <button
                @click="showRentModal = false"
                class="flex-1 py-3 rounded-xl border border-warm-200 text-xs font-bold text-warm-700 hover:bg-warm-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                @click="submitRental"
                :disabled="submitting || !rentalStartDate || !rentalEndDate"
                class="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold shadow-md hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🔒</span>
                <span>{{ submitting ? 'Processing...' : 'Confirm & Request Rental' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Listing Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showEditModal"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          @click.self="showEditModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-bold text-warm-900">Edit Listing</h3>

            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-warm-800 mb-1.5">Title</label>
                <input
                  v-model="editForm.title"
                  type="text"
                  class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                  :class="{ 'border-red-400': editErrors.title }"
                />
                <p v-if="editErrors.title" class="text-red-500 text-xs mt-1">{{ editErrors.title[0] }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-800 mb-1.5">Description</label>
                <textarea
                  v-model="editForm.description"
                  rows="3"
                  class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
                  :class="{ 'border-red-400': editErrors.description }"
                ></textarea>
                <p v-if="editErrors.description" class="text-red-500 text-xs mt-1">{{ editErrors.description[0] }}</p>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm font-medium text-warm-800 mb-1.5">Daily Rate ($)</label>
                  <input
                    v-model="editForm.daily_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    :class="{ 'border-red-400': editErrors.daily_rate }"
                  />
                  <p v-if="editErrors.daily_rate" class="text-red-500 text-xs mt-1">{{ editErrors.daily_rate[0] }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-800 mb-1.5">Weekly ($)</label>
                  <input
                    v-model="editForm.weekly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    :class="{ 'border-red-400': editErrors.weekly_rate }"
                  />
                  <p v-if="editErrors.weekly_rate" class="text-red-500 text-xs mt-1">{{ editErrors.weekly_rate[0] }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-800 mb-1.5">Monthly ($)</label>
                  <input
                    v-model="editForm.monthly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    :class="{ 'border-red-400': editErrors.monthly_rate }"
                  />
                  <p v-if="editErrors.monthly_rate" class="text-red-500 text-xs mt-1">{{ editErrors.monthly_rate[0] }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-800 mb-1.5">Security Deposit ($)</label>
                  <input
                    v-model="editForm.security_deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    :class="{ 'border-red-400': editErrors.security_deposit }"
                  />
                  <p v-if="editErrors.security_deposit" class="text-red-500 text-xs mt-1">{{ editErrors.security_deposit[0] }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-800 mb-1.5">Category</label>
                  <select
                    v-model="editForm.category_id"
                    class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                    :class="{ 'border-red-400': editErrors.category_id }"
                  >
                    <option value="" disabled>Select category</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                  <p v-if="editErrors.category_id" class="text-red-500 text-xs mt-1">{{ editErrors.category_id[0] }}</p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-800 mb-1.5">Location</label>
                <input
                  v-model="editForm.location"
                  type="text"
                  class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                  :class="{ 'border-red-400': editErrors.location }"
                />
                <p v-if="editErrors.location" class="text-red-500 text-xs mt-1">{{ editErrors.location[0] }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-800 mb-1.5">Available From</label>
                <input
                  v-model="editForm.available_from"
                  type="date"
                  class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                  :class="{ 'border-red-400': editErrors.available_from }"
                />
                <p v-if="editErrors.available_from" class="text-red-500 text-xs mt-1">{{ editErrors.available_from[0] }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-800 mb-1.5">Available To</label>
                <input
                  v-model="editForm.available_to"
                  type="date"
                  class="w-full px-4 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                  :class="{ 'border-red-400': editErrors.available_to }"
                />
                <p v-if="editErrors.available_to" class="text-red-500 text-xs mt-1">{{ editErrors.available_to[0] }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-800 mb-1.5">Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleEditImage"
                  class="w-full px-4 py-2 rounded-xl border border-warm-200 text-sm text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
                />
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                @click="showEditModal = false"
                class="flex-1 py-2.5 rounded-xl border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="submitEdit"
                :disabled="editSubmitting"
                class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ editSubmitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          @click.self="showDeleteModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-warm-900">Delete Listing</h3>
                <p class="text-sm text-warm-500">This action cannot be undone.</p>
              </div>
            </div>
            <p class="text-sm text-warm-700">Are you sure you want to delete <strong>"{{ listing.title }}"</strong>? All associated data will be permanently removed.</p>
            <div class="flex gap-3">
              <button
                @click="showDeleteModal = false"
                :disabled="deleteSubmitting"
                class="flex-1 py-2.5 rounded-xl border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmDelete"
                :disabled="deleteSubmitting"
                class="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ deleteSubmitting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Review Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showReviewModal"
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          @click.self="showReviewModal = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-warm-100 pb-3">
              <h3 class="text-lg font-bold text-warm-900">Write a Review</h3>
              <button @click="showReviewModal = false" class="p-1 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label class="block text-sm font-semibold text-warm-800 mb-2">Your Star Rating</label>
              <div class="flex items-center justify-center gap-2 bg-warm-50 p-4 rounded-xl border border-warm-200">
                <button
                  v-for="n in 5"
                  :key="n"
                  @click="reviewRating = n"
                  @mouseenter="reviewHoverRating = n"
                  @mouseleave="reviewHoverRating = 0"
                  type="button"
                  class="p-1.5 transition-transform hover:scale-110 focus:outline-none"
                >
                  <svg
                    class="w-9 h-9 transition-colors"
                    :class="n <= (reviewHoverRating || reviewRating) ? 'fill-amber-400 text-amber-400' : 'fill-warm-200 text-warm-200'"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              </div>
              <p class="text-xs font-semibold text-center text-amber-700 mt-2 h-4">
                {{ ratingLabels[reviewHoverRating || reviewRating] }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-semibold text-warm-800 mb-1.5">Review Comment</label>
              <textarea
                v-model="reviewComment"
                rows="4"
                placeholder="Share your experience renting this item... Was it clean and in good condition? Was the owner helpful?"
                class="w-full px-4 py-3 rounded-xl border border-warm-200 text-sm text-warm-800 placeholder-warm-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
              ></textarea>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                @click="showReviewModal = false"
                class="flex-1 py-2.5 rounded-xl border border-warm-200 text-sm font-medium text-warm-700 hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                @click="submitReview"
                :disabled="reviewSubmitting"
                class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ reviewSubmitting ? 'Submitting...' : 'Submit Review' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Direct Contact Owner Modal -->
    <ContactOwnerModal
      v-if="listing"
      :show="showContactOwnerModal"
      :listing="listing"
      @close="showContactOwnerModal = false"
    />

    <!-- Side-by-Side Compare Modal -->
    <CompareModal
      :show="showCompareModal"
      :listing-ids="compareListingIds"
      @close="showCompareModal = false"
      @remove-item="handleRemoveCompareItem"
    />
  </div>

  <div v-else class="max-w-6xl mx-auto px-6 py-10">
      <div class="bg-white/60 backdrop-blur-sm rounded-2xl border border-warm-200 p-12 text-center">
        <p class="text-warm-500">Listing not found.</p>
      </div>
    </div>
</template>
