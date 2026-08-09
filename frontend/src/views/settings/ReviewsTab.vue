<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reviewsAPI } from '../../services/api'

const reviews = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await reviewsAPI.getMyReviews()
    reviews.value = res.data?.data ?? res.data ?? []
  } catch {
    reviews.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-warm-900 mb-1">My Reviews</h3>
    <p class="text-sm text-warm-500 mb-6">Reviews you've left and received.</p>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="reviews.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 text-warm-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
      <p class="text-warm-500 text-sm">No reviews yet.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="r in reviews"
        :key="r.id"
        class="p-4 bg-white rounded-lg border border-warm-200"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1">
            <svg
              v-for="i in 5"
              :key="i"
              :class="['w-4 h-4', i <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-warm-200']"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <span class="text-xs text-warm-400">{{ formatDate(r.created_at) }}</span>
        </div>
        <p v-if="r.comment" class="text-sm text-warm-700">{{ r.comment }}</p>
        <p v-if="r.listing" class="mt-2 text-xs text-warm-400">on: {{ r.listing.title }}</p>
      </div>
    </div>
  </div>
</template>
