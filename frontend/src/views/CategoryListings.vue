<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { categoriesAPI, listingsAPI } from '../services/api.js'
import ListingCard from '../components/ListingCard.vue'
import ListingCardSkeleton from '../components/ListingCardSkeleton.vue'

const route = useRoute()

const category = ref(null)
const listings = ref([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const currentPage = ref(1)
const perPage = 12

async function load() {
  loading.value = true
  error.value = ''
  try {
    const catRes = await categoriesAPI.getBySlug(route.params.slug)
    category.value = catRes.data

    const listingRes = await listingsAPI.getAll({
      category_id: catRes.data.id,
      include_subcategories: 1,
      per_page: perPage,
      page: currentPage.value,
    })
    listings.value = listingRes.data.data
    total.value = listingRes.data.total
  } catch (e) {
    if (e.response?.status === 404) {
      error.value = 'Category not found.'
    } else {
      error.value = 'Failed to load category.'
    }
  } finally {
    loading.value = false
  }
}

watch(() => route.params.slug, () => {
  currentPage.value = 1
  load()
})

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-warm-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Loading -->
      <div v-if="loading" class="space-y-6">
        <div class="space-y-2">
          <div class="h-8 bg-warm-200 rounded-lg w-1/4 animate-pulse"></div>
          <div class="h-4 bg-warm-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <ListingCardSkeleton :count="8" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-lg text-warm-500">{{ error }}</p>
      </div>

      <!-- Content -->
      <template v-else-if="category">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-warm-900">{{ category.name }}</h1>
          <p v-if="category.description" class="mt-2 text-warm-500">{{ category.description }}</p>
          <p class="mt-1 text-sm text-warm-400">
            {{ total }} listing{{ total !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Empty -->
        <div v-if="listings.length === 0" class="text-center py-20">
          <p class="text-lg text-warm-400">No listings in this category yet.</p>
        </div>

        <!-- Listing grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <ListingCard v-for="listing in listings" :key="listing.id" :listing="listing" />
        </div>
      </template>
    </div>
  </div>
</template>
