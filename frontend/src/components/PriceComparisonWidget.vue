<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { listingsAPI } from '../services/api'
import { listingFirstImage, listingImageUrl } from '../utils/imageUrl'

const props = defineProps({
  listingId: {
    type: [Number, String],
    required: true
  },
  currentListing: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['open-compare'])

const loading = ref(true)
const comparison = ref(null)
const error = ref(null)

async function fetchComparisonData() {
  if (!props.listingId) return
  loading.value = true
  error.value = null
  try {
    const res = await listingsAPI.getPriceComparison(props.listingId)
    comparison.value = res.data
  } catch (err) {
    console.error('Failed to load price comparison:', err)
    error.value = 'Price comparison data unavailable'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchComparisonData()
})

watch(() => props.listingId, () => {
  fetchComparisonData()
})

const benchmarks = computed(() => comparison.value?.benchmarks || {})
const analysis = computed(() => comparison.value?.analysis || {})
const similarItems = computed(() => comparison.value?.similar_items || [])

// Calculate percentage position of current price on min-max bar
const pricePositionPercent = computed(() => {
  const min = benchmarks.value.category_min_daily || 0
  const max = benchmarks.value.category_max_daily || 100
  const current = Number(props.currentListing?.daily_rate || comparison.value?.target?.daily_rate || 0)
  if (max === min) return 50
  const pct = Math.round(((current - min) / (max - min)) * 100)
  return Math.min(95, Math.max(5, pct))
})

const avgPositionPercent = computed(() => {
  const min = benchmarks.value.category_min_daily || 0
  const max = benchmarks.value.category_max_daily || 100
  const avg = benchmarks.value.neighborhood_avg_daily || benchmarks.value.category_avg_daily || 50
  if (max === min) return 50
  const pct = Math.round(((avg - min) / (max - min)) * 100)
  return Math.min(95, Math.max(5, pct))
})

function triggerCompareWith(item) {
  emit('open-compare', [Number(props.listingId), Number(item.id)])
}
</script>

<template>
  <div class="bg-white/80 backdrop-blur-sm rounded-2xl border border-warm-200 p-6 space-y-6 shadow-2xs">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-warm-100 pb-4">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-warm-900 flex items-center gap-2">
            Neighborhood Price Benchmark
            <span class="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
              Smart Analysis
            </span>
          </h3>
          <p class="text-xs text-warm-500">Real-time local market pricing comparison for {{ benchmarks.category_name || 'similar items' }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-8 flex flex-col items-center justify-center space-y-3">
      <div class="w-7 h-7 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-warm-500 font-medium">Analyzing neighborhood market rates...</p>
    </div>

    <!-- Error / No Data -->
    <div v-else-if="error" class="py-4 text-center text-xs text-warm-500">
      {{ error }}
    </div>

    <!-- Comparison Content -->
    <div v-else class="space-y-6">
      <!-- Deal Badge Banner -->
      <div
        class="rounded-xl p-4 border flex items-center justify-between gap-4"
        :class="{
          'bg-emerald-50/80 border-emerald-200 text-emerald-900': analysis.deal_badge_color === 'emerald',
          'bg-teal-50/80 border-teal-200 text-teal-900': analysis.deal_badge_color === 'teal',
          'bg-blue-50/80 border-blue-200 text-blue-900': analysis.deal_badge_color === 'blue',
          'bg-purple-50/80 border-purple-200 text-purple-900': analysis.deal_badge_color === 'purple'
        }"
      >
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs"
              :class="{
                'bg-emerald-600 text-white': analysis.deal_badge_color === 'emerald',
                'bg-teal-600 text-white': analysis.deal_badge_color === 'teal',
                'bg-blue-600 text-white': analysis.deal_badge_color === 'blue',
                'bg-purple-600 text-white': analysis.deal_badge_color === 'purple'
              }"
            >
              {{ analysis.deal_badge }}
            </span>
            <span class="text-xs font-bold">
              {{ analysis.diff_vs_neighborhood_avg_percent <= 0 ? `${Math.abs(analysis.diff_vs_neighborhood_avg_percent)}% lower than average` : `${analysis.diff_vs_neighborhood_avg_percent}% above average` }}
            </span>
          </div>
          <p class="text-xs text-warm-700 leading-snug">
            {{ analysis.deal_description }}
          </p>
        </div>

        <div v-if="analysis.estimated_weekly_savings > 0" class="text-right shrink-0 bg-white/80 px-3 py-2 rounded-lg border border-warm-200">
          <p class="text-[10px] uppercase font-bold text-warm-500">Weekly Savings</p>
          <p class="text-sm font-extrabold text-emerald-600">${{ analysis.estimated_weekly_savings }}</p>
        </div>
      </div>

      <!-- Price Benchmark Gauge Bar -->
      <div class="space-y-2 bg-warm-50/70 p-4 rounded-xl border border-warm-200/80">
        <div class="flex items-center justify-between text-xs font-semibold text-warm-600">
          <span>Min in Area: ${{ benchmarks.category_min_daily }}/day</span>
          <span class="text-brand-700 font-bold">Category Avg: ${{ benchmarks.neighborhood_avg_daily }}/day</span>
          <span>Max in Area: ${{ benchmarks.category_max_daily }}/day</span>
        </div>

        <div class="relative h-4 rounded-full bg-warm-200 overflow-visible my-3">
          <!-- Gradient fill -->
          <div class="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-rose-300 opacity-80"></div>
          
          <!-- Neighborhood Average Marker -->
          <div
            class="absolute top-0 bottom-0 w-1 bg-warm-800 z-10 rounded-full transform -translate-x-1/2"
            :style="{ left: `${avgPositionPercent}%` }"
            title="Neighborhood Average"
          >
            <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-warm-800 whitespace-nowrap bg-white px-1.5 py-0.5 rounded shadow-2xs border border-warm-200">
              Avg ${{ benchmarks.neighborhood_avg_daily }}
            </div>
          </div>

          <!-- Current Item Price Indicator Pin -->
          <div
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-brand-600 border-2 border-white shadow-md z-20 flex items-center justify-center transition-all"
            :style="{ left: `${pricePositionPercent}%` }"
          >
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            <!-- Tooltip -->
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-brand-700 whitespace-nowrap bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
              This Item (${{ comparison.target.daily_rate }})
            </div>
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between text-[11px] text-warm-500">
          <span>Based on {{ benchmarks.neighborhood_sample_size }} active listings nearby</span>
          <span class="font-medium text-warm-700">Security Deposit Avg: ${{ benchmarks.category_avg_deposit }}</span>
        </div>
      </div>

      <!-- Comparison Metrics Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div class="p-3 bg-white rounded-xl border border-warm-200 text-center">
          <p class="text-[11px] text-warm-500 font-medium">Daily Rate</p>
          <div class="flex items-baseline justify-center gap-1 mt-1">
            <span class="text-base font-extrabold text-warm-900">${{ comparison.target.daily_rate }}</span>
            <span class="text-[10px] text-warm-500">vs ${{ benchmarks.neighborhood_avg_daily }} avg</span>
          </div>
        </div>

        <div class="p-3 bg-white rounded-xl border border-warm-200 text-center">
          <p class="text-[11px] text-warm-500 font-medium">Weekly Rate</p>
          <div class="flex items-baseline justify-center gap-1 mt-1">
            <span class="text-base font-extrabold text-warm-900">${{ comparison.target.weekly_rate || 'N/A' }}</span>
            <span class="text-[10px] text-warm-500">vs ${{ benchmarks.category_avg_weekly }} avg</span>
          </div>
        </div>

        <div class="p-3 bg-white rounded-xl border border-warm-200 text-center col-span-2 md:col-span-1">
          <p class="text-[11px] text-warm-500 font-medium">Security Deposit</p>
          <div class="flex items-baseline justify-center gap-1 mt-1">
            <span class="text-base font-extrabold text-warm-900">${{ comparison.target.security_deposit || 0 }}</span>
            <span class="text-[10px] text-warm-500">vs ${{ benchmarks.category_avg_deposit }} avg</span>
          </div>
        </div>
      </div>

      <!-- Similar Neighborhood Listings Side-by-Side Comparison List -->
      <div v-if="similarItems.length" class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-warm-900 uppercase tracking-wider flex items-center gap-1.5">
            <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            Similar Items Nearby
          </h4>
          <span class="text-[11px] text-warm-500">Compare rates & specs</span>
        </div>

        <div class="space-y-2.5">
          <div
            v-for="item in similarItems"
            :key="item.id"
            class="flex items-center justify-between gap-3 p-3 rounded-xl border border-warm-200/90 bg-white hover:border-brand-300 hover:shadow-xs transition-all group"
          >
            <!-- Left: Thumbnail & Details -->
            <RouterLink :to="`/listings/${item.id}`" class="flex items-center gap-3 min-w-0 flex-1">
              <img
                :src="listingFirstImage(item)"
                :alt="item.title"
                class="w-12 h-12 rounded-lg object-cover bg-warm-100 shrink-0"
              />
              <div class="min-w-0">
                <h5 class="text-xs font-bold text-warm-900 truncate group-hover:text-brand-600 transition-colors">
                  {{ item.title }}
                </h5>
                <div class="flex items-center gap-2 text-[11px] text-warm-500 mt-0.5">
                  <span class="truncate">{{ item.location }}</span>
                  <span v-if="item.rating" class="flex items-center gap-0.5 text-amber-500 font-semibold shrink-0">
                    ★ {{ Number(item.rating).toFixed(1) }}
                  </span>
                </div>
              </div>
            </RouterLink>

            <!-- Right: Price Difference & Compare Button -->
            <div class="flex items-center gap-3 shrink-0">
              <div class="text-right">
                <p class="text-xs font-extrabold text-warm-900">${{ item.daily_rate }}<span class="text-[10px] font-normal text-warm-500">/day</span></p>
                <p
                  class="text-[10px] font-bold"
                  :class="item.price_diff_vs_target < 0 ? 'text-emerald-600' : (item.price_diff_vs_target > 0 ? 'text-rose-500' : 'text-warm-500')"
                >
                  {{ item.price_diff_vs_target < 0 ? `-$${Math.abs(item.price_diff_vs_target)} cheaper` : (item.price_diff_vs_target > 0 ? `+$${item.price_diff_vs_target} higher` : 'Same price') }}
                </p>
              </div>

              <button
                @click="triggerCompareWith(item)"
                class="px-2.5 py-1.5 rounded-lg bg-warm-100 hover:bg-brand-50 text-warm-800 hover:text-brand-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-warm-200"
                title="Compare side-by-side"
              >
                <svg class="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                <span>Compare</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
