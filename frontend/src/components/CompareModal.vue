<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listingsAPI } from '../services/api'
import { listingFirstImage } from '../utils/imageUrl'
import Modal from './Modal.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  listingIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'remove-item'])
const router = useRouter()

const loading = ref(true)
const comparisonData = ref(null)
const error = ref(null)

async function fetchComparison() {
  if (!props.listingIds || !props.listingIds.length) {
    comparisonData.value = null
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await listingsAPI.compareListings(props.listingIds)
    comparisonData.value = res.data
  } catch (err) {
    console.error('Failed to load comparison details:', err)
    error.value = 'Failed to load comparison details'
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) fetchComparison()
})

watch(() => props.listingIds, () => {
  if (props.show) fetchComparison()
}, { deep: true })

onMounted(() => {
  if (props.show) fetchComparison()
})

const listings = computed(() => comparisonData.value?.listings || [])
const summary = computed(() => comparisonData.value?.summary || {})

function handleRemove(id) {
  emit('remove-item', id)
}

function goToDetail(id) {
  emit('close')
  router.push(`/listings/${id}`)
}
</script>

<template>
  <Modal :show="show" title="Side-by-Side Rental Rate Comparison" max-width="4xl" @close="emit('close')">
    <div v-if="loading" class="py-12 flex flex-col items-center justify-center space-y-3">
      <div class="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-semibold text-warm-600">Generating side-by-side deal analysis...</p>
    </div>

    <div v-else-if="error" class="py-10 text-center space-y-3">
      <p class="text-sm text-rose-600 font-medium">{{ error }}</p>

    </div>

    <div v-else-if="!listings.length" class="py-10 text-center space-y-2">
      <p class="text-sm font-semibold text-warm-700">No items selected for comparison</p>
      <p class="text-xs text-warm-500">Select at least 2 items from the catalog or detail page to compare.</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Summary Bar -->
      <div class="bg-gradient-to-r from-brand-500/10 via-amber-500/10 to-emerald-500/10 border border-brand-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
            {{ summary.total_compared }}
          </div>
          <div>
            <h4 class="text-sm font-bold text-warm-900">Comparing {{ summary.total_compared }} Neighborhood Listings</h4>
            <p class="text-xs text-warm-600">Average daily rate: <span class="font-extrabold text-brand-700">${{ summary.average_daily_rate }}/day</span></p>
          </div>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            ★ Lowest Daily Rate: ${{ summary.lowest_daily_rate }}/day
          </span>
        </div>
      </div>

      <!-- Comparison Matrix Table -->
      <div class="overflow-x-auto rounded-2xl border border-warm-200">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-warm-50 border-b border-warm-200">
              <th class="p-4 w-40 text-xs font-bold text-warm-500 uppercase tracking-wider shrink-0 bg-warm-50/90 sticky left-0 z-10 border-r border-warm-200">
                Item Feature
              </th>
              <th
                v-for="item in listings"
                :key="item.id"
                class="p-4 min-w-[220px] text-center align-top relative border-r last:border-r-0 border-warm-200 bg-white"
              >
                <!-- Remove item button -->
                <button
                  @click="handleRemove(item.id)"
                  class="absolute top-2 right-2 w-6 h-6 rounded-full bg-warm-100 hover:bg-rose-100 text-warm-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove from comparison"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>

                <!-- Best Value Tag -->
                <div v-if="summary && item.id === summary.best_value_listing_id" class="mb-2">
                  <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-600 text-white shadow-2xs">
                    🏆 Overall Best Value
                  </span>
                </div>

                <!-- Thumbnail -->
                <img
                  :src="listingFirstImage(item)"
                  :alt="item.title"
                  class="w-full h-28 object-cover rounded-xl bg-warm-100 mb-3 border border-warm-200"
                />
                <h5 class="text-xs font-extrabold text-warm-900 line-clamp-2 h-8 leading-snug">
                  {{ item.title }}
                </h5>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-warm-200 text-xs text-warm-800">
            <!-- Owner / Provider -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Provider / Company
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white">
                <span class="font-bold text-warm-900 block">{{ item.company?.name || item.owner_name || item.user_name || 'Neighbor Owner' }}</span>
                <span v-if="item.company?.is_verified" class="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 mt-0.5">
                  ✓ Verified Business
                </span>
              </td>
            </tr>

            <!-- Daily Rate -->
            <tr class="bg-brand-50/30">
              <td class="p-4 font-extrabold text-brand-800 bg-brand-50/80 sticky left-0 z-10 border-r border-warm-200">
                Daily Rate
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white">
                <div class="text-base font-black text-brand-600">
                  ${{ item.daily_rate }}<span class="text-xs font-normal text-warm-500">/day</span>
                </div>
                <div v-if="Number(item.daily_rate) === summary.lowest_daily_rate" class="mt-1">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Lowest Rate
                  </span>
                </div>
              </td>
            </tr>

            <!-- Weekly Rate -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Weekly Rate
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white font-medium">
                {{ item.weekly_rate ? `$${item.weekly_rate}/wk` : 'N/A' }}
              </td>
            </tr>

            <!-- Security Deposit -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Security Deposit
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white font-medium">
                {{ item.security_deposit ? `$${item.security_deposit}` : '$0 Deposit' }}
              </td>
            </tr>

            <!-- Neighborhood Location -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Location
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white">
                <span class="font-medium text-warm-800">{{ item.location }}</span>
              </td>
            </tr>

            <!-- User Rating -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Rating & Reviews
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white">
                <div class="flex items-center justify-center gap-1 font-bold text-amber-500">
                  <span>★</span>
                  <span>{{ Number(item.rating || 5.0).toFixed(1) }}</span>
                  <span class="text-warm-400 font-normal">({{ item.rating_count || 1 }})</span>
                </div>
              </td>
            </tr>

            <!-- Rental Agreement -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Agreement Terms
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white text-[11px] text-warm-600">
                <div class="line-clamp-3 italic">
                  {{ item.agreement_text || 'Standard neighborhood rental compliance agreement apply.' }}
                </div>
              </td>
            </tr>

            <!-- Action Button -->
            <tr>
              <td class="p-4 font-semibold text-warm-500 bg-warm-50/50 sticky left-0 z-10 border-r border-warm-200">
                Rent Action
              </td>
              <td v-for="item in listings" :key="item.id" class="p-4 text-center border-r last:border-r-0 border-warm-200 bg-white">
                <button
                  @click="goToDetail(item.id)"
                  class="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <span>View & Rent</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Modal>
</template>
