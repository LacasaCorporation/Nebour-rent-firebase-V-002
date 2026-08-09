<script setup>
import { ref, computed } from 'vue'
import { listingImageUrl } from '../utils/imageUrl.js'

const props = defineProps({
  images: { type: Array, default: () => [] },
  fallback: { type: String, default: null },
})

const activeIndex = ref(0)

const imageUrls = computed(() => {
  return props.images.map((img) => listingImageUrl(img))
})

const activeImage = computed(() => {
  return imageUrls.value[activeIndex.value] || props.fallback
})

function selectImage(index) {
  activeIndex.value = index
}

function prevImage() {
  if (activeIndex.value > 0) activeIndex.value--
}

function nextImage() {
  if (activeIndex.value < imageUrls.value.length - 1) activeIndex.value++
}
</script>

<template>
  <div v-if="images.length > 0">
    <!-- Main Image -->
    <div class="relative group rounded-2xl overflow-hidden bg-warm-100">
      <div class="aspect-[16/10]">
        <img
          :src="activeImage"
          alt="Listing image"
          class="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>

      <!-- Navigation arrows -->
      <button
        v-if="imageUrls.length > 1 && activeIndex > 0"
        @click="prevImage"
        class="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg text-warm-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      <button
        v-if="imageUrls.length > 1 && activeIndex < imageUrls.length - 1"
        @click="nextImage"
        class="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-lg text-warm-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <!-- Counter -->
      <span
        v-if="imageUrls.length > 1"
        class="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-medium"
      >
        {{ activeIndex + 1 }} / {{ imageUrls.length }}
      </span>
    </div>

    <!-- Thumbnails -->
    <div
      v-if="imageUrls.length > 1"
      class="flex gap-2 mt-3 overflow-x-auto pb-1"
    >
      <button
        v-for="(url, index) in imageUrls"
        :key="index"
        @click="selectImage(index)"
        class="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all"
        :class="index === activeIndex ? 'border-brand-500 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'"
      >
        <img :src="url" alt="" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>

  <!-- Fallback when no images -->
  <div
    v-else
    class="aspect-[16/10] rounded-2xl bg-warm-100 flex items-center justify-center"
  >
    <div class="text-center text-warm-400">
      <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.41a2.25 2.25 0 0 1 3.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
      <p class="text-sm">No images available</p>
    </div>
  </div>
</template>
