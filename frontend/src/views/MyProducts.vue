<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { productsAPI } from '../services/api.js'

interface Product {
  id: number
  name: string
  description?: string
  price: number
  category?: { id: number; name: string }
  category_id?: number
  image?: string
  status: string
  user?: { id: number; name: string }
}

const router = useRouter()
const products = ref<Product[]>([])
const loading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const deletingId = ref<number | null>(null)

onMounted(() => fetchProducts())

async function fetchProducts() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: currentPage.value }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    const res = await productsAPI.getMyProducts(params)
    const data = res.data
    if (data?.data) {
      products.value = data.data
      totalPages.value = data.last_page || 1
    } else if (Array.isArray(data)) {
      products.value = data
    } else {
      products.value = []
    }
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  currentPage.value = 1
  fetchProducts()
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchProducts()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchProducts()
  }
}

async function deleteProduct(id: number) {
  if (!confirm('Are you sure you want to delete this product?')) return
  deletingId.value = id
  try {
    await productsAPI.delete(id)
    products.value = products.value.filter((p) => p.id !== id)
  } catch {
    alert('Failed to delete product.')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-warm-900">My Products</h1>
        <p class="text-warm-500 text-sm mt-1">Manage your products</p>
      </div>
      <button
        class="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        @click="router.push('/create-product')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Product
      </button>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search your products..."
        class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-warm-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        @input="onSearch"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-warm-200 overflow-hidden animate-pulse">
        <div class="aspect-[4/3] bg-warm-100" />
        <div class="p-4 space-y-3">
          <div class="h-4 bg-warm-100 rounded w-3/4" />
          <div class="h-3 bg-warm-100 rounded w-1/2" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!products.length" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto text-warm-200 mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 11.625l2.25-2.25M12 11.625l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
      <h3 class="text-lg font-semibold text-warm-700 mb-1">No products yet</h3>
      <p class="text-warm-400 text-sm mb-6">List your first product to start renting it out.</p>
      <button
        class="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        @click="router.push('/create-product')"
      >
        Create Product
      </button>
    </div>

    <!-- Grid -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="product in products"
          :key="product.id"
          class="bg-white rounded-xl border border-warm-200 overflow-hidden group cursor-pointer hover:shadow-card-hover transition-shadow"
          @click="router.push(`/products/${product.id}`)"
        >
          <div class="p-4">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h3 class="font-semibold text-warm-900 text-[15px] leading-snug line-clamp-1">
                {{ product.name }}
              </h3>
              <span
                class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
                :class="{
                  'bg-green-100 text-green-700': product.status === 'available',
                  'bg-amber-100 text-amber-700': product.status === 'rented',
                  'bg-warm-100 text-warm-600': product.status === 'maintenance',
                }"
              >
                {{ product.status }}
              </span>
            </div>
            <p class="text-sm text-warm-500 line-clamp-1 mb-3">
              {{ product.description || 'No description' }}
            </p>
            <p class="font-semibold text-warm-900">${{ Number(product.price).toFixed(2) }}<span class="text-warm-400 font-normal text-xs"> /day</span></p>
          </div>
          <div class="flex border-t border-warm-100">
            <button
              class="flex-1 py-2.5 text-sm text-warm-600 hover:bg-warm-50 transition-colors font-medium flex items-center justify-center gap-1.5"
              @click.stop="router.push(`/my-products/${product.id}/edit`)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Edit
            </button>
            <button
              class="flex-1 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-1.5"
              :disabled="deletingId === product.id"
              @click.stop="deleteProduct(product.id)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-6">
        <button
          class="px-3 py-1.5 text-sm rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-40 transition-colors"
          :disabled="currentPage <= 1"
          @click="prevPage"
        >
          Previous
        </button>
        <span class="text-sm text-warm-500">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          class="px-3 py-1.5 text-sm rounded-lg border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-40 transition-colors"
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
