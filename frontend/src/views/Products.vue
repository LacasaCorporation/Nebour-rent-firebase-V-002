<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { productsAPI, api as apiClient } from '../services/api.js'

const route = useRoute()
const router = useRouter()

const products = ref([])
const loading = ref(true)
const searchQuery = ref(route.query.search || '')
const selectedCategoryId = ref(route.query.category_id || '')
const sortBy = ref(route.query.sort || 'newest')
const currentPage = ref(1)
const totalPages = ref(1)

const categories = ref([{ id: '', name: 'All' }])
const sortOptions = [
  { value: 'newest', label: 'Newest', field: 'created_at', direction: 'desc' },
  { value: 'price_low', label: 'Price: low to high', field: 'price', direction: 'asc' },
  { value: 'price_high', label: 'Price: high to low', field: 'price', direction: 'desc' },
  { value: 'name_asc', label: 'Name: A-Z', field: 'name', direction: 'asc' },
  { value: 'name_desc', label: 'Name: Z-A', field: 'name', direction: 'desc' },
]

onMounted(async () => {
  try {
    const res = await apiClient.get('/categories')
    const cats = res.data?.data || res.data || []
    categories.value = [{ id: '', name: 'All' }, ...cats]
  } catch {
    // keep default
  }
  fetchProducts()
})

async function fetchProducts() {
  loading.value = true
  try {
    const sortOpt = sortOptions.find(o => o.value === sortBy.value) || sortOptions[0]
    const params = {
      page: currentPage.value,
      sort: sortOpt.field,
      direction: sortOpt.direction,
    }
    if (searchQuery.value) params.search = searchQuery.value
    if (selectedCategoryId.value) params.category_id = selectedCategoryId.value

    const response = await productsAPI.getAll(params)
    products.value = response.data?.data || response.data || []
    totalPages.value = response.data?.last_page || 1
  } catch (e) {
    console.error('Failed to load products:', e)
    products.value = []
  } finally {
    loading.value = false
  }
}

function updateQuery() {
  const query = {}
  if (searchQuery.value) query.search = searchQuery.value
  if (selectedCategoryId.value) query.category_id = selectedCategoryId.value
  if (sortBy.value !== 'newest') query.sort = sortBy.value
  router.replace({ query })
}

function selectCategory(catId) {
  selectedCategoryId.value = catId
  currentPage.value = 1
  updateQuery()
  fetchProducts()
}

function handleSearch() {
  currentPage.value = 1
  updateQuery()
  fetchProducts()
}

function handleSort() {
  currentPage.value = 1
  updateQuery()
  fetchProducts()
}

function loadMore() {
  currentPage.value++
  fetchProducts()
}

watch(() => route.query, (newQuery) => {
  searchQuery.value = newQuery.search || ''
  selectedCategoryId.value = newQuery.category_id || ''
  sortBy.value = newQuery.sort || 'newest'
  fetchProducts()
})
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-10">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-warm-900">Browse products</h1>
      <p class="text-warm-500 mt-1">Discover products available near you</p>
    </div>

    <!-- Search + Sort bar -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative flex-1">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          type="text"
          placeholder="Search products..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-200 rounded-lg text-sm text-warm-800 placeholder:text-warm-400"
        />
      </div>

      <select
        v-model="sortBy"
        @change="handleSort"
        class="px-4 py-2.5 bg-white border border-warm-200 rounded-lg text-sm text-warm-700 cursor-pointer min-w-[160px]"
      >
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Category filters -->
    <div class="flex flex-wrap gap-2 mb-8">
      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="selectCategory(cat.id)"
        class="px-4 py-2 rounded-full text-sm font-medium transition-colors"
        :class="
          selectedCategoryId === cat.id
            ? 'bg-warm-900 text-white'
            : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-300 hover:text-warm-800'
        "
      >
        {{ cat.name }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-5 gap-5">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-white rounded-xl border border-warm-200 overflow-hidden"
      >
        <div class="aspect-[4/3] bg-warm-100 image-loading"></div>
        <div class="p-4 space-y-3">
          <div class="h-4 bg-warm-100 rounded w-3/4 image-loading"></div>
          <div class="h-3 bg-warm-100 rounded w-1/2 image-loading"></div>
        </div>
      </div>
    </div>

    <!-- Products grid -->
    <div v-else-if="products.length" class="grid grid-cols-5 gap-5">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>

    <!-- Empty -->
    <div v-else class="text-center py-24">
      <div class="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-warm-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
      <p class="text-warm-700 font-medium text-lg">No products found</p>
      <p class="text-warm-400 mt-1 text-sm">Try adjusting your search or filters</p>
      <button
        @click="searchQuery = ''; selectedCategoryId = ''; handleSearch()"
        class="mt-4 text-sm text-brand-500 font-medium hover:text-brand-600"
      >
        Clear all filters
      </button>
    </div>

    <!-- Load more -->
    <div v-if="!loading && products.length && currentPage < totalPages" class="text-center mt-10">
      <button
        @click="loadMore"
        class="px-8 py-3 bg-white border border-warm-200 text-warm-700 text-sm font-medium rounded-lg hover:border-warm-300 transition-colors"
      >
        Load more
      </button>
    </div>
  </div>
</template>
