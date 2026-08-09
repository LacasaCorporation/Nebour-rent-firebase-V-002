<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listingFirstImage } from '../utils/imageUrl'
import { useFavoritesStore } from '../stores/favorites'
import IdentityBadge from './IdentityBadge.vue'
import CalendarPicker from './CalendarPicker.vue'

const router = useRouter()
const favoritesStore = useFavoritesStore()

interface Category {
  id: number
  name: string
  slug?: string
}

interface Listing {
  id: number
  title: string
  description?: string
  daily_rate: number
  weekly_rate?: number
  monthly_rate?: number
  category?: Category
  category_id?: number
  location?: string
  images?: string[]
  status?: string
  rating?: number
  rating_count?: number
  user?: {
    id: number
    name: string
  }
}

const props = defineProps<{
  listing: Listing
  isFavorited?: boolean
  isCompared?: boolean
  manageable?: boolean
}>()

const emit = defineEmits<{
  rent: [payload: { listing: Listing; startDate?: string; endDate?: string }]
  'toggle-favorite': [listingId: number]
  'toggle-compare': [listingId: number]
  edit: [listingId: number]
  delete: [listingId: number]
}>()

// Default dates helper
function getInitialDates() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const inThreeDays = new Date(today)
  inThreeDays.setDate(today.getDate() + 4)

  const format = (d: Date) => d.toISOString().split('T')[0]
  return {
    start: format(tomorrow),
    end: format(inThreeDays)
  }
}

const initialDates = getInitialDates()
const startDate = ref(initialDates.start)
const endDate = ref(initialDates.end)
const showCalendarPopover = ref(false)

const dateRangeModel = computed({
  get: () => ({ start: startDate.value, end: endDate.value }),
  set: (val: { start?: string; end?: string }) => {
    if (val.start) startDate.value = val.start
    if (val.end) endDate.value = val.end
  }
})

const rentalDays = computed(() => {
  if (!startDate.value || !endDate.value) return 1
  const s = new Date(startDate.value)
  const e = new Date(endDate.value)
  const diffTime = e.getTime() - s.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 1
})

const totalCost = computed(() => {
  return rentalDays.value * Number(props.listing?.daily_rate || 0)
})

const favorited = computed(() => {
  if (props.isFavorited !== undefined) return props.isFavorited
  return props.listing?.id ? favoritesStore.isFavorited(props.listing.id) : false
})

const primaryImage = computed(() => {
  return props.listing ? listingFirstImage(props.listing) : ''
})

const categoryLabel = computed(() => {
  return props.listing?.category?.name || 'Other'
})

// Status indicator configuration
const statusConfig = computed(() => {
  const status = (props.listing?.status || 'available').toLowerCase()
  if (status === 'rented' || status === 'currently rented' || status === 'unavailable') {
    return {
      label: 'Currently Rented',
      badgeClass: 'bg-amber-500/95 text-white shadow-xs',
      dotClass: 'bg-amber-200',
      isAvailable: false
    }
  }
  if (status === 'maintenance' || status === 'repair') {
    return {
      label: 'Maintenance',
      badgeClass: 'bg-rose-500/95 text-white shadow-xs',
      dotClass: 'bg-rose-200',
      isAvailable: false
    }
  }
  return {
    label: 'Available',
    badgeClass: 'bg-emerald-500/95 text-white shadow-xs',
    dotClass: 'bg-emerald-200 animate-pulse',
    isAvailable: true
  }
})

function handleFavoriteClick(e: MouseEvent) {
  e.stopPropagation()
  if (!props.listing?.id) return
  favoritesStore.toggleFavorite(props.listing.id)
  emit('toggle-favorite', props.listing.id)
}

function handleRent(e: MouseEvent) {
  e.stopPropagation()
  if (!props.listing?.id) return
  emit('rent', { listing: props.listing, startDate: startDate.value, endDate: endDate.value })
  router.push({
    path: `/listings/${props.listing.id}`,
    query: { start_date: startDate.value, end_date: endDate.value }
  })
}

function toggleCalendar(e: MouseEvent) {
  e.stopPropagation()
  showCalendarPopover.value = !showCalendarPopover.value
}
</script>

<template>
  <div
    class="bg-white rounded-xl border border-warm-200 overflow-hidden hover:shadow-card-hover transition-all duration-200 cursor-pointer group flex flex-col justify-between"
    @click="listing?.id && router.push(`/listings/${listing.id}`)"
  >
    <div>
      <!-- Image & Badges -->
      <div class="relative aspect-[4/3] overflow-hidden bg-warm-100">
        <img
          v-if="primaryImage"
          :src="primaryImage"
          :alt="listing?.title || 'Listing'"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-warm-100">
          <svg class="w-12 h-12 text-warm-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
          </svg>
        </div>

        <!-- Status & Category Badges -->
        <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center z-10">
          <!-- Status Indicator -->
          <div
            :class="[statusConfig.badgeClass, 'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full backdrop-blur-md transition-all']"
          >
            <span :class="[statusConfig.dotClass, 'w-1.5 h-1.5 rounded-full']"></span>
            <span>{{ statusConfig.label }}</span>
          </div>

          <!-- Category Badge -->
          <div
            v-if="listing?.category"
            class="px-2.5 py-1 bg-white/90 text-warm-800 text-[11px] font-semibold rounded-full shadow-xs backdrop-blur-md"
          >
            {{ categoryLabel }}
          </div>
        </div>

        <!-- Compare & Wishlist Action Buttons -->
        <div class="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            @click.stop="listing?.id && emit('toggle-compare', listing.id)"
            :title="isCompared ? 'Remove from comparison' : 'Compare pricing side-by-side'"
            class="px-2.5 py-1.5 rounded-full text-[11px] font-bold backdrop-blur-md transition-all shadow-md cursor-pointer flex items-center gap-1"
            :class="isCompared ? 'bg-brand-600 text-white ring-2 ring-brand-300' : 'bg-white/90 text-warm-700 hover:bg-white hover:text-brand-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <span>{{ isCompared ? 'Compared' : 'Compare' }}</span>
          </button>

          <button
            @click="handleFavoriteClick"
            :title="favorited ? 'Remove from Wishlist' : 'Save to Wishlist'"
            class="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md hover:bg-white hover:scale-110 active:scale-95 transition-all shadow-md group/btn"
          >
            <svg
              :class="['w-4 h-4 transition-colors duration-200', favorited ? 'text-red-500 fill-red-500' : 'text-warm-500 group-hover/btn:text-red-500']"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Card Content -->
      <div class="p-4">
        <!-- Title + Price row -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <h3 class="font-bold text-warm-900 text-[15px] leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
            {{ listing?.title }}
          </h3>
          <div class="text-right shrink-0">
            <p class="font-bold text-warm-900 text-[15px]">
              ${{ Number(listing?.daily_rate || 0).toFixed(0) }}
            </p>
            <p class="text-warm-400 text-[11px] font-medium">/day</p>
          </div>
        </div>

        <!-- Owner + Location -->
        <div class="flex items-center gap-2 text-xs text-warm-500 flex-wrap">
          <span v-if="listing?.user" class="flex items-center gap-1 font-medium">
            <svg class="w-3.5 h-3.5 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            {{ listing.user.name }}
          </span>
          <IdentityBadge
            v-if="listing?.user"
            :is-verified="listing.user.is_id_verified !== false"
            :badge-type="listing.user.id_badge_type || 'trusted_lender'"
            size="sm"
          />
          <span v-if="listing?.user && listing?.location" class="text-warm-300">&middot;</span>
          <span v-if="listing?.location" class="flex items-center gap-1 truncate">
            <svg class="w-3.5 h-3.5 text-warm-400 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span class="truncate">{{ listing.location }}</span>
          </span>
          <span
            v-if="listing?.distance_km !== null && listing?.distance_km !== undefined"
            class="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-full border border-brand-200/60 shrink-0 flex items-center gap-1"
          >
            <span>📍</span>
            <span>{{ listing.distance_km }} km away</span>
          </span>
        </div>

        <!-- Rating & Community Trust Badge -->
        <div v-if="listing?.rating" class="flex items-center gap-1.5 mt-2">
          <div class="inline-flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
            <svg class="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{{ Number(listing.rating).toFixed(1) }}</span>
          </div>
          <span v-if="listing.rating_count !== undefined" class="text-[11px] text-warm-500 font-medium">
            ({{ listing.rating_count }} {{ listing.rating_count === 1 ? 'review' : 'reviews' }})
          </span>
        </div>

        <!-- Description preview -->
        <p
          v-if="listing?.description"
          class="mt-2.5 text-xs text-warm-500 leading-relaxed line-clamp-2"
        >
          {{ listing.description }}
        </p>

        <!-- Direct Inline Date Picker & Duration Selector -->
        <div v-if="statusConfig.isAvailable && !manageable" class="mt-3 pt-3 border-t border-warm-100" @click.stop>
          <div class="flex items-center justify-between text-[11px] font-bold text-warm-700 mb-1.5">
            <span class="flex items-center gap-1">
              <span>📅 Select Rental Dates</span>
            </span>
            <button
              type="button"
              @click="toggleCalendar"
              class="text-brand-600 hover:text-brand-700 text-[10px] font-bold underline cursor-pointer"
            >
              {{ showCalendarPopover ? 'Hide Calendar' : 'Visual Calendar' }}
            </button>
          </div>

          <!-- Quick Date Range Inputs -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="block text-[10px] text-warm-500 font-medium mb-0.5">Start Date</label>
              <input
                type="date"
                v-model="startDate"
                class="w-full px-2 py-1 text-[11px] font-semibold bg-warm-50 border border-warm-200 rounded-lg text-warm-800 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              />
            </div>
            <div>
              <label class="block text-[10px] text-warm-500 font-medium mb-0.5">End Date</label>
              <input
                type="date"
                v-model="endDate"
                class="w-full px-2 py-1 text-[11px] font-semibold bg-warm-50 border border-warm-200 rounded-lg text-warm-800 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
              />
            </div>
          </div>

          <!-- Calendar Popover Drawer -->
          <Transition name="fade">
            <div v-if="showCalendarPopover" class="mt-2.5 p-2 bg-warm-50/90 rounded-xl border border-warm-200">
              <CalendarPicker v-model="dateRangeModel" label="Choose Rental Period" />
            </div>
          </Transition>

          <!-- Duration & Price Calculation -->
          <div class="mt-2 flex items-center justify-between text-[11px] font-bold text-warm-800 bg-brand-50/80 px-2.5 py-1 rounded-lg border border-brand-200/60">
            <span>{{ rentalDays }} {{ rentalDays === 1 ? 'day' : 'days' }} rental</span>
            <span class="text-brand-700 font-black">${{ totalCost.toFixed(0) }} total</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="p-4 pt-0 mt-auto">
      <!-- Rent Button for available items -->
      <button
        v-if="statusConfig.isAvailable && !manageable"
        @click="handleRent"
        class="w-full py-2.5 bg-brand-500 text-white text-xs font-bold rounded-xl hover:bg-brand-600 active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Book {{ rentalDays }} {{ rentalDays === 1 ? 'Day' : 'Days' }} (${{ totalCost.toFixed(0) }})</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>

      <!-- Wishlist / Inquire button for non-available items -->
      <button
        v-else-if="!statusConfig.isAvailable && !manageable"
        @click="handleFavoriteClick"
        class="w-full py-2.5 bg-warm-100 text-warm-700 hover:bg-warm-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
      >
        <svg
          :class="['w-3.5 h-3.5', favorited ? 'text-red-500 fill-red-500' : 'text-warm-500']"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
        <span>{{ favorited ? 'Saved in Wishlist' : 'Save to Wishlist for later' }}</span>
      </button>

      <!-- Owner actions -->
      <div v-if="manageable" class="flex gap-2 border-t border-warm-100 pt-3">
        <button
          class="flex-1 py-2 text-xs text-warm-700 bg-warm-50 hover:bg-warm-100 rounded-lg transition-colors font-semibold flex items-center justify-center gap-1"
          @click.stop="emit('edit', listing.id)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          Edit
        </button>
        <button
          class="flex-1 py-2 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors font-semibold flex items-center justify-center gap-1"
          @click.stop="emit('delete', listing.id)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

