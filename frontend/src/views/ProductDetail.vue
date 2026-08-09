<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api, { productsAPI } from '../services/api.js'
import { useAuthStore } from '../stores/auth.js'
import { productImageUrl } from '../utils/imageUrl.js'

interface Product {
  id: number
  name: string
  description?: string
  price: number
  category_id?: number
  category?: { id: number; name: string }
  image?: string
  status: string
  user?: { id: number; name: string }
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const product = ref<Product | null>(null)
const loading = ref(true)
const error = ref('')
const deleting = ref(false)

const isOwner = computed(() => {
  if (!product.value || !authStore.currentUser.value) return false
  return product.value.user?.id === authStore.currentUser.value.id
})

// Rent modal
const rentOpen = ref(false)
const startDate = ref('')
const endDate = ref('')
const rentLoading = ref(false)
const rentSuccess = ref(false)
const rentError = ref('')

function openRent() {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  startDate.value = today
  endDate.value = nextWeek
  rentError.value = ''
  rentSuccess.value = false
  rentOpen.value = true
}

async function submitRent() {
  rentLoading.value = true
  rentError.value = ''
  try {
    await api.post('/rental-requests', {
      listing_id: product.value?.id,
      start_date: startDate.value,
      end_date: endDate.value,
    })
    rentSuccess.value = true
    setTimeout(() => {
      rentOpen.value = false
    }, 1500)
  } catch (e: any) {
    rentError.value = e.response?.data?.message || e.response?.data?.error || 'Failed to submit rental request'
  } finally {
    rentLoading.value = false
  }
}

// Edit modal
const editOpen = ref(false)
const editForm = ref({ name: '', description: '', price: '', category_id: '', status: '' })
const editLoading = ref(false)
const editErrors = ref<Record<string, string[]>>({})

onMounted(() => fetchProduct())

async function fetchProduct() {
  try {
    const id = route.params.id
    const res = await productsAPI.show(id)
    const data = res.data?.data || res.data
    product.value = data
  } catch {
    error.value = 'Product not found'
  } finally {
    loading.value = false
  }
}

function openEdit() {
  if (!product.value) return
  editForm.value = {
    name: product.value.name,
    description: product.value.description || '',
    price: String(product.value.price),
    category_id: String(product.value.category_id || product.value.category?.id || ''),
    status: product.value.status,
  }
  editErrors.value = {}
  editOpen.value = true
}

async function saveEdit() {
  editLoading.value = true
  editErrors.value = {}
  try {
    const id = route.params.id
    await productsAPI.update(id, {
      name: editForm.value.name,
      description: editForm.value.description,
      price: editForm.value.price,
      category_id: editForm.value.category_id,
      status: editForm.value.status,
    })
    editOpen.value = false
    await fetchProduct()
  } catch (e: any) {
    if (e.response?.status === 422) {
      editErrors.value = e.response.data.errors || {}
    }
  } finally {
    editLoading.value = false
  }
}

async function deleteProduct() {
  if (!confirm('Are you sure? This cannot be undone.')) return
  deleting.value = true
  try {
    await productsAPI.delete(route.params.id)
    router.push('/products')
  } catch {
    alert('Failed to delete product.')
    deleting.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="aspect-[16/9] bg-warm-100 rounded-xl" />
      <div class="space-y-3">
        <div class="h-6 bg-warm-100 rounded w-1/3" />
        <div class="h-4 bg-warm-100 rounded w-2/3" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <h2 class="text-xl font-semibold text-warm-700 mb-1">{{ error }}</h2>
      <button class="mt-4 text-sm text-primary-500 hover:underline" @click="router.push('/products')">
        Back to products
      </button>
    </div>

    <!-- Product -->
    <div v-else-if="product" class="space-y-8">
      <!-- Image + Info -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            :src="productImageUrl(product.image)"
            :alt="product.name"
            class="w-full aspect-square object-cover rounded-xl border border-warm-200"
          />
        </div>
        <div class="space-y-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h1 class="text-2xl font-bold text-warm-900">{{ product.name }}</h1>
              <p v-if="product.category" class="text-sm text-primary-500 font-medium mt-1">
                {{ product.category.name }}
              </p>
            </div>
            <span
              class="shrink-0 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs flex items-center gap-1.5"
              :class="{
                'bg-emerald-50 text-emerald-700 border-emerald-200': product.status === 'available',
                'bg-amber-50 text-amber-800 border-amber-200': product.status === 'rented' || product.status === 'currently rented' || product.status === 'unavailable',
                'bg-rose-50 text-rose-700 border-rose-200': product.status === 'maintenance',
              }"
            >
              <span :class="['w-2 h-2 rounded-full', product.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500']"></span>
              <span>{{ product.status === 'available' ? 'Available' : (product.status === 'rented' || product.status === 'currently rented' || product.status === 'unavailable') ? 'Currently Rented' : 'Maintenance' }}</span>
            </span>
          </div>

          <div>
            <p class="text-3xl font-bold text-warm-900">
              ${{ Number(product.price).toFixed(2) }}
              <span class="text-base text-warm-400 font-normal">/day</span>
            </p>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-warm-700 mb-1.5">Description</h3>
            <p class="text-warm-600 text-sm leading-relaxed">
              {{ product.description || 'No description provided.' }}
            </p>
          </div>

          <div v-if="product.user" class="flex items-center gap-2 text-sm text-warm-500 bg-warm-50 rounded-lg px-4 py-3">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Listed by {{ product.user.name }}
          </div>

          <!-- Owner actions -->
          <div v-if="isOwner" class="flex gap-3 pt-3">
            <button
              class="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              @click="openEdit"
            >
              Edit Product
            </button>
            <button
              class="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
              :disabled="deleting"
              @click="deleteProduct"
            >
              Delete
            </button>
          </div>

          <!-- Renter action -->
          <div v-else-if="product.status === 'available'" class="pt-3">
            <button
              @click="openRent"
              class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              Request to Rent
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rent Modal -->
    <div
      v-if="rentOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="rentOpen = false"
    >
      <div class="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-warm-900">Rent {{ product?.name }}</h2>
          <button class="p-1 text-warm-400 hover:text-warm-600" @click="rentOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="rentSuccess" class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm text-center">
          Rental request submitted successfully!
        </div>

        <form v-else @submit.prevent="submitRent" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Start Date</label>
            <input
              v-model="startDate"
              type="date"
              required
              class="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">End Date</label>
            <input
              v-model="endDate"
              type="date"
              required
              class="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <p v-if="rentError" class="text-red-500 text-xs mt-1">{{ rentError }}</p>

          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="rentLoading"
              class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {{ rentLoading ? 'Submitting...' : 'Confirm Request' }}
            </button>
            <button
              type="button"
              class="px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-lg text-sm transition-colors"
              @click="rentOpen = false"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="editOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="editOpen = false"
    >
      <div class="bg-white rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-bold text-warm-900">Edit Product</h2>
          <button class="p-1 text-warm-400 hover:text-warm-600" @click="editOpen = false">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form @submit.prevent="saveEdit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Name</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              :class="{ 'border-red-400': editErrors.name }"
            />
            <p v-if="editErrors.name" class="text-red-500 text-xs mt-0.5">{{ editErrors.name[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Description</label>
            <textarea
              v-model="editForm.description"
              rows="3"
              class="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              :class="{ 'border-red-400': editErrors.description }"
            />
            <p v-if="editErrors.description" class="text-red-500 text-xs mt-0.5">{{ editErrors.description[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Daily Rate ($)</label>
            <input
              v-model="editForm.price"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              :class="{ 'border-red-400': editErrors.price }"
            />
            <p v-if="editErrors.price" class="text-red-500 text-xs mt-0.5">{{ editErrors.price[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Status</label>
            <select
              v-model="editForm.status"
              class="w-full rounded-lg border border-warm-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              class="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              :disabled="editLoading"
            >
              <span v-if="editLoading" class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                </svg>
                Saving...
              </span>
              <span v-else>Save</span>
            </button>
            <button
              type="button"
              class="px-5 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-lg text-sm transition-colors"
              @click="editOpen = false"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
