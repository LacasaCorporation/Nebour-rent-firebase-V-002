<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { productImageUrl } from '../utils/imageUrl'

const router = useRouter()

interface Category {
  id: number
  name: string
  slug?: string
}

interface Product {
  id: number
  name: string
  description?: string
  price: number
  category?: Category
  category_id?: number
  image?: string
  status?: string
  user?: {
    id: number
    name: string
  }
}

const props = defineProps<{
  product: Product
}>()

const primaryImage = computed(() => {
  return productImageUrl(props.product.image)
})

const categoryLabel = computed(() => {
  return props.product.category?.name || 'Other'
})

const isAvailable = computed(() => {
  return props.product.status === 'available'
})
</script>

<template>
  <div
    class="bg-white rounded-xl border border-warm-200 overflow-hidden hover:shadow-card-hover transition-shadow duration-200 cursor-pointer group"
    @click="router.push(`/products/${product.id}`)"
  >
    <!-- Image -->
    <div class="relative aspect-[4/3] overflow-hidden bg-warm-100">
      <img
        v-if="primaryImage"
        :src="primaryImage"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <svg class="w-12 h-12 text-warm-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v11.25Z" />
        </svg>
      </div>

      <!-- Status badge -->
      <div
        v-if="!isAvailable"
        class="absolute top-3 left-3 px-2.5 py-1 bg-warm-800/80 text-white text-xs font-medium rounded-full backdrop-blur-sm"
      >
        {{ product.status === 'rented' ? 'Rented' : 'Maintenance' }}
      </div>

      <!-- Category tag -->
      <div
        v-if="product.category"
        class="absolute top-3 right-3 px-2.5 py-1 bg-white/90 text-warm-700 text-xs font-medium rounded-full"
      >
        {{ categoryLabel }}
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <!-- Name + Price row -->
      <div class="flex items-start justify-between gap-2 mb-2">
        <h3 class="font-semibold text-warm-900 text-[15px] leading-snug line-clamp-2">
          {{ product.name }}
        </h3>
        <div class="text-right shrink-0">
          <p class="font-semibold text-warm-900 text-[15px]">
            ${{ Number(product.price).toFixed(2) }}
          </p>
        </div>
      </div>

      <!-- Owner -->
      <div v-if="product.user" class="flex items-center gap-1 text-xs text-warm-500">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        {{ product.user.name }}
      </div>

      <!-- Description preview -->
      <p
        v-if="product.description"
        class="mt-2.5 text-xs text-warm-500 leading-relaxed line-clamp-2"
      >
        {{ product.description }}
      </p>
    </div>
  </div>
</template>
