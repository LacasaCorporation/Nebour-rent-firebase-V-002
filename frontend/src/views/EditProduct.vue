<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { productsAPI } from '../services/api.js'
import api from '../services/api'

const router = useRouter()
const route = useRoute()

const categories = ref<{ id: number; name: string }[]>([])
const loading = ref(true)
const saving = ref(false)
const errors = ref<Record<string, string[]>>({})
const notFound = ref(false)

const form = ref({
  name: '',
  description: '',
  price: '',
  category_id: '',
  status: 'available',
  image: null as File | null,
})

const existingImage = ref<string | null>(null)
const imagePreview = ref<string | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  try {
    const [catRes, prodRes] = await Promise.all([
      api.get('/categories'),
      productsAPI.show(route.params.id),
    ])
    const catData = catRes.data?.data || catRes.data
    categories.value = Array.isArray(catData) ? catData : []

    const product = prodRes.data?.data || prodRes.data
    if (!product || !product.id) {
      notFound.value = true
      return
    }

    form.value = {
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      category_id: String(product.category_id || product.category?.id || ''),
      status: product.status,
      image: null,
    }
    existingImage.value = product.image || null
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

function onImageChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  form.value.image = file
  const reader = new FileReader()
  reader.onload = (ev) => { imagePreview.value = ev.target?.result as string }
  reader.readAsDataURL(file)
}

function removeImage() {
  form.value.image = null
  imagePreview.value = null
}

async function submit() {
  saving.value = true
  errors.value = {}
  try {
    const formData = new FormData()
    formData.append('_method', 'PUT')
    formData.append('name', form.value.name)
    formData.append('description', form.value.description)
    formData.append('price', String(form.value.price))
    formData.append('category_id', String(form.value.category_id))
    formData.append('status', form.value.status)
    if (form.value.image) {
      formData.append('image', form.value.image)
    }
    await api.post(`/products/${route.params.id}`, formData)
    router.push('/my-products')
  } catch (e: any) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors || {}
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-warm-900">Edit Product</h1>
      <p class="text-warm-500 text-sm mt-1">Update your product details</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4 animate-pulse">
      <div class="h-10 bg-warm-100 rounded-lg w-1/2" />
      <div class="h-24 bg-warm-100 rounded-lg" />
      <div class="h-10 bg-warm-100 rounded-lg" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="text-center py-16">
      <h2 class="text-xl font-semibold text-warm-700">Product not found</h2>
      <button class="mt-4 text-sm text-primary-500 hover:underline" @click="router.push('/my-products')">
        Back to My Products
      </button>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="submit" class="space-y-6">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1.5">Product Name</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          :class="{ 'border-red-400': errors.name }"
        />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name[0] }}</p>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1.5">Description</label>
        <textarea
          v-model="form.description"
          rows="4"
          class="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          :class="{ 'border-red-400': errors.description }"
        />
        <p v-if="errors.description" class="text-red-500 text-xs mt-1">{{ errors.description[0] }}</p>
      </div>

      <!-- Price -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1.5">Daily Rate ($)</label>
        <input
          v-model="form.price"
          type="number"
          step="0.01"
          min="0"
          class="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          :class="{ 'border-red-400': errors.price }"
        />
        <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price[0] }}</p>
      </div>

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1.5">Category</label>
        <select
          v-model="form.category_id"
          class="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          :class="{ 'border-red-400': errors.category_id }"
        >
          <option value="" disabled>Select a category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <p v-if="errors.category_id" class="text-red-500 text-xs mt-1">{{ errors.category_id[0] }}</p>
      </div>

      <!-- Status -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1.5">Status</label>
        <select
          v-model="form.status"
          class="w-full rounded-lg border border-warm-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        >
          <option value="available">Available</option>
          <option value="rented">Rented</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <!-- Image -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1.5">Photo</label>
        <div
          v-if="!imagePreview && !existingImage"
          class="border-2 border-dashed border-warm-200 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
          @click="imageInput?.click()"
        >
          <svg class="w-10 h-10 mx-auto text-warm-300 mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-3.75-3.75 1.5-1.5a2.25 2.25 0 0 1 3.182 0L21 12.75M12 18.75a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
          </svg>
          <p class="text-sm text-warm-500">Click to upload</p>
        </div>
        <div v-else class="relative">
          <img
            :src="imagePreview || existingImage"
            class="w-full h-64 object-cover rounded-xl"
            alt="Preview"
          />
          <button
            type="button"
            class="absolute top-3 right-3 p-1.5 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
            @click="removeImage"
          >
            <svg class="w-4 h-4 text-warm-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onImageChange"
        />
        <p v-if="errors.image" class="text-red-500 text-xs mt-1">{{ errors.image[0] }}</p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 pt-4">
        <button
          type="submit"
          class="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          :disabled="saving"
        >
          <span v-if="saving" class="flex items-center justify-center gap-2">
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
            </svg>
            Saving...
          </span>
          <span v-else>Update Product</span>
        </button>
        <button
          type="button"
          class="px-6 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-lg transition-colors text-sm font-medium"
          @click="router.push('/my-products')"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
