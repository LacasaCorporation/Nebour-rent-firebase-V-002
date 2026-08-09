<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { savedSearchesAPI } from '../../services/api'

const router = useRouter()
const searches = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await savedSearchesAPI.getAll()
    searches.value = res.data?.data ?? res.data ?? []
  } catch {
    searches.value = []
  } finally {
    loading.value = false
  }
}

async function remove(id: number) {
  try {
    await savedSearchesAPI.delete(id)
    searches.value = searches.value.filter((s: any) => s.id !== id)
  } catch {
    //
  }
}

function runSearch(s: any) {
  const params = new URLSearchParams(s.query ?? s.params ?? {})
  router.push(`/listings?${params.toString()}`)
}

onMounted(load)
</script>

<template>
  <div>
    <h3 class="text-lg font-semibold text-warm-900 mb-1">Saved Searches</h3>
    <p class="text-sm text-warm-500 mb-6">Quick-access to your searches.</p>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="searches.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 text-warm-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <p class="text-warm-500 text-sm">No saved searches.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="s in searches"
        :key="s.id"
        class="flex items-center justify-between p-4 bg-white rounded-lg border border-warm-200 hover:border-warm-300 transition-colors"
      >
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-warm-900 truncate">{{ s.name ?? s.query?.keyword ?? 'Search' }}</p>
          <p class="text-xs text-warm-500 mt-0.5 truncate">{{ JSON.stringify(s.query ?? s.params) }}</p>
        </div>
        <div class="flex items-center gap-2 ml-4 shrink-0">
          <button
            @click="runSearch(s)"
            class="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Run
          </button>
          <button
            @click="remove(s.id)"
            class="p-1.5 text-warm-400 hover:text-red-500 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
