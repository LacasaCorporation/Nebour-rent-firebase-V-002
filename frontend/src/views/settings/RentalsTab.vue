<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { rentalsAPI } from '../../services/api'

const rentals = ref<any[]>([])
const lendings = ref<any[]>([])
const activeTab = ref<'rented' | 'lent'>('rented')
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [r, l] = await Promise.all([
      rentalsAPI.getMyRentals(),
      rentalsAPI.getMyLendings(),
    ])
    rentals.value = r.data?.data ?? r.data ?? []
    lendings.value = l.data?.data ?? l.data ?? []
  } catch {
    //
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function statusClass(status: string) {
  if (status === 'active' || status === 'confirmed') return 'text-green-600 bg-green-50'
  if (status === 'pending') return 'text-yellow-600 bg-yellow-50'
  if (status === 'completed') return 'text-warm-600 bg-warm-100'
  if (status === 'cancelled') return 'text-red-600 bg-red-50'
  return 'text-warm-500 bg-warm-50'
}

onMounted(load)
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-warm-900 mb-1">Rentals</h3>
    <p class="text-sm text-warm-500 mb-6">Items you're renting or lending out.</p>

    <!-- Sub-tabs -->
    <div class="flex gap-1 mb-6 p-0.5 bg-warm-100 rounded-lg w-fit">
      <button
        :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors', activeTab === 'rented' ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700']"
        @click="activeTab = 'rented'"
      >
        Rented by me
      </button>
      <button
        :class="['px-4 py-2 text-sm font-medium rounded-md transition-colors', activeTab === 'lent' ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700']"
        @click="activeTab = 'lent'"
      >
        Lent out
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <template v-else-if="activeTab === 'rented'">
      <div v-if="rentals.length === 0" class="text-center py-12">
        <svg class="w-12 h-12 text-warm-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        <p class="text-warm-500 text-sm">No rentals yet.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="r in rentals" :key="r.id" class="p-4 bg-white rounded-lg border border-warm-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-warm-900">{{ r.listing?.title ?? 'Item' }}</p>
              <p class="text-xs text-warm-500 mt-0.5">
                {{ formatDate(r.start_date) }} – {{ formatDate(r.end_date) }}
              </p>
            </div>
            <span :class="['px-2.5 py-1 text-xs font-medium rounded-full capitalize', statusClass(r.status)]">
              {{ r.status }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="lendings.length === 0" class="text-center py-12">
        <svg class="w-12 h-12 text-warm-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        <p class="text-warm-500 text-sm">No items lent out yet.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="r in lendings" :key="r.id" class="p-4 bg-white rounded-lg border border-warm-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-warm-900">{{ r.listing?.title ?? 'Item' }}</p>
              <p class="text-xs text-warm-500 mt-0.5">
                {{ formatDate(r.start_date) }} – {{ formatDate(r.end_date) }}
              </p>
            </div>
            <span :class="['px-2.5 py-1 text-xs font-medium rounded-full capitalize', statusClass(r.status)]">
              {{ r.status }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
