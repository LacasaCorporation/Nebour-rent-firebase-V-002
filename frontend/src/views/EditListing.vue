<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { categoriesAPI, listingsAPI } from '../services/api.js'
import CalendarPicker from '../components/CalendarPicker.vue'
import AddressLocationPicker from '../components/AddressLocationPicker.vue'
import { listingImageUrl } from '../utils/imageUrl'
import { useToast } from '../composables/useToast'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const notFound = ref(false)
const unauthorized = ref(false)
const errors = ref({})
const categories = ref([])

const form = ref({
  title: '',
  description: '',
  daily_rate: '',
  weekly_rate: '',
  monthly_rate: '',
  security_deposit: '',
  location: '',
  address: '',
  category_id: '',
  status: 'available',
  available_from: '',
  available_to: '',
  agreement_text: '',
})

// Existing stored paths + newly uploaded paths
const existingImages = ref([]) // strings like "listings/xxx.jpg"
const newImageFiles = ref([]) // File objects to upload
const newImagePreviews = ref([]) // data URLs for preview

// Rental agreement
const originalAgreement = ref('') // document path stored server-side
const existingAgreement = ref('') // currently kept document path
const agreementFile = ref(null) // new file to upload
const MAX_AGREEMENT_SIZE = 10 * 1024 * 1024

const canAddMore = computed(() => existingImages.value.length + newImageFiles.value.length < 10)

function imageSrc(path) {
  return listingImageUrl(path, '')
}

onMounted(async () => {
  try {
    const [catRes, listingRes] = await Promise.all([
      categoriesAPI.getAll({ params: { flat: 1 } }),
      listingsAPI.get(route.params.id),
    ])
    categories.value = catRes.data?.data || catRes.data || []

    const listing = listingRes.data?.data || listingRes.data
    if (!listing?.id) {
      notFound.value = true
      return
    }

    form.value = {
      title: listing.title || '',
      description: listing.description || '',
      daily_rate: listing.daily_rate ?? '',
      weekly_rate: listing.weekly_rate ?? '',
      monthly_rate: listing.monthly_rate ?? '',
      security_deposit: listing.security_deposit ?? '',
      location: listing.location || '',
      address: listing.address || '',
      lat: listing.lat ?? null,
      lng: listing.lng ?? null,
      category_id: String(listing.category_id || listing.category?.id || ''),
      status: listing.status || 'available',
      available_from: listing.available_from?.slice?.(0, 10) || listing.available_from || '',
      available_to: listing.available_to?.slice?.(0, 10) || listing.available_to || '',
      agreement_text: listing.agreement_text || '',
    }
    originalAgreement.value = listing.agreement_document || ''
    existingAgreement.value = originalAgreement.value

    const imgs = Array.isArray(listing.images) ? listing.images : []
    existingImages.value = imgs.filter(Boolean)
  } catch (e) {
    if (e.response?.status === 403) {
      unauthorized.value = true
    } else {
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
})

function handleImageUpload(e) {
  const files = Array.from(e.target.files || [])
  files.forEach((file) => {
    if (!canAddMore.value) return
    newImageFiles.value.push(file)
    const reader = new FileReader()
    reader.onload = (ev) => { newImagePreviews.value.push(ev.target.result) }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

function removeExisting(index) {
  existingImages.value.splice(index, 1)
}

function removeNew(index) {
  newImageFiles.value.splice(index, 1)
  newImagePreviews.value.splice(index, 1)
}

function handleAgreementUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_AGREEMENT_SIZE) {
    toast.error('Agreement file must be under 10 MB')
    e.target.value = ''
    return
  }
  agreementFile.value = file
  e.target.value = ''
}

function removeAgreementFile() {
  agreementFile.value = null
}

function removeExistingAgreement() {
  existingAgreement.value = ''
  form.value.agreement_text = ''
}

async function submitForm() {
  saving.value = true
  errors.value = {}
  try {
    // Upload any newly selected files first
    let uploadedPaths = []
    if (newImageFiles.value.length > 0) {
      const uploadRes = await listingsAPI.uploadImages(newImageFiles.value)
      uploadedPaths = uploadRes.data?.paths || []
    }

    // Final image list = kept existing + newly uploaded
    const finalPaths = [...existingImages.value, ...uploadedPaths]

    const fd = new FormData()
    Object.entries(form.value).forEach(([key, val]) => {
      if (val !== '' && val !== null && val !== undefined) fd.append(key, val)
    })
    fd.append('_method', 'PUT')
    finalPaths.forEach((path) => fd.append('images[]', path))
    if (agreementFile.value) fd.append('agreement_document', agreementFile.value)
    if (originalAgreement.value && !existingAgreement.value && !agreementFile.value) {
      fd.append('remove_agreement_document', '1')
    }
    await listingsAPI.update(route.params.id, fd)
    toast.success('Listing updated successfully')
    router.push('/my-listings')
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors || {}
    } else if (e.response?.status === 403) {
      toast.error('You are not authorized to edit this listing')
    } else {
      toast.error(e.response?.data?.message || 'Failed to update listing')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-10">
    <button
      @click="router.push('/my-listings')"
      class="flex items-center gap-2 text-sm text-warm-500 hover:text-brand-500 transition-colors font-medium mb-6"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back to My Listings
    </button>

    <div v-if="loading" class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-8 space-y-4 animate-pulse">
      <div class="h-8 bg-warm-100 rounded-lg w-1/2" />
      <div class="h-24 bg-warm-100 rounded-lg" />
      <div class="h-10 bg-warm-100 rounded-lg" />
    </div>

    <div v-else-if="notFound" class="text-center py-16">
      <h2 class="text-xl font-semibold text-warm-700">Listing not found</h2>
      <button class="mt-4 text-sm text-brand-500 hover:underline" @click="router.push('/my-listings')">
        Back to My Listings
      </button>
    </div>

    <div v-else-if="unauthorized" class="text-center py-16">
      <h2 class="text-xl font-semibold text-warm-700">Not authorized</h2>
      <p class="text-sm text-warm-500 mt-1">You can only edit your own listings.</p>
      <button class="mt-4 text-sm text-brand-500 hover:underline" @click="router.push('/my-listings')">
        Back to My Listings
      </button>
    </div>

    <div v-else class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-8">
      <h1 class="text-2xl font-bold text-warm-900 mb-1">Edit Listing</h1>
      <p class="text-sm text-warm-500 mb-8">Update your listing details</p>

      <form @submit.prevent="submitForm" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-warm-800 mb-1.5">Title</label>
          <input
            v-model="form.title"
            type="text"
            class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            :class="{ 'border-red-400': errors.title }"
          />
          <p v-if="errors.title" class="text-xs text-danger mt-1">{{ errors.title[0] }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-warm-800 mb-1.5">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
            :class="{ 'border-red-400': errors.description }"
          />
          <p v-if="errors.description" class="text-xs text-danger mt-1">{{ errors.description[0] }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Daily Price ($)</label>
            <input
              v-model="form.daily_rate"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              :class="{ 'border-red-400': errors.daily_rate }"
            />
            <p v-if="errors.daily_rate" class="text-xs text-danger mt-1">{{ errors.daily_rate[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Weekly Price ($)</label>
            <input
              v-model="form.weekly_rate"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Monthly Price ($)</label>
            <input
              v-model="form.monthly_rate"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Security Deposit ($)</label>
            <input
              v-model="form.security_deposit"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Category</label>
            <select
              v-model="form.category_id"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              :class="{ 'border-red-400': errors.category_id }"
            >
              <option value="">Select category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            <p v-if="errors.category_id" class="text-xs text-danger mt-1">{{ errors.category_id[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Status</label>
            <select
              v-model="form.status"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div class="space-y-4 pt-1 pb-2">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Neighborhood / City</label>
            <input
              v-model="form.location"
              type="text"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
              :class="{ 'border-red-400': errors.location }"
            />
            <p v-if="errors.location" class="text-xs text-danger mt-1">{{ errors.location[0] }}</p>
          </div>

          <AddressLocationPicker
            :address="form.address"
            :location="form.location"
            :lat="form.lat"
            :lng="form.lng"
            @update:address="val => form.address = val"
            @update:location="val => { if (!form.location || val) form.location = val }"
            @update:lat="val => form.lat = val"
            @update:lng="val => form.lng = val"
          />
        </div>

        <CalendarPicker
          :model-value="{ start: form.available_from, end: form.available_to }"
          @update:model-value="(val) => { form.available_from = val.start || ''; form.available_to = val.end || '' }"
          label="Availability Range"
        />

        <!-- Photos -->
        <div>
          <label class="block text-sm font-medium text-warm-800 mb-1.5">Photos (max 10)</label>

          <div v-if="existingImages.length > 0 || newImagePreviews.length > 0" class="grid grid-cols-3 gap-3 mb-3">
            <!-- Existing images -->
            <div v-for="(path, index) in existingImages" :key="'e' + index" class="relative group">
              <img :src="imageSrc(path)" class="w-full h-28 object-cover rounded-xl border border-warm-200" alt="Listing image" />
              <button
                type="button"
                class="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                @click="removeExisting(index)"
              >
                <svg class="w-3.5 h-3.5 text-warm-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- New images -->
            <div v-for="(preview, index) in newImagePreviews" :key="'n' + index" class="relative group">
              <img :src="preview" class="w-full h-28 object-cover rounded-xl border border-brand-300 ring-2 ring-brand-100" alt="New image preview" />
              <button
                type="button"
                class="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                @click="removeNew(index)"
              >
                <svg class="w-3.5 h-3.5 text-warm-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Add more -->
            <label
              v-if="canAddMore"
              class="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-warm-200 hover:border-brand-300 bg-white/50 cursor-pointer transition-colors"
            >
              <svg class="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span class="text-xs text-slate-500">Add more</span>
              <input type="file" accept="image/*" multiple @change="handleImageUpload" class="hidden" />
            </label>
          </div>

          <label
            v-else
            class="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-warm-200 hover:border-brand-300 bg-white/50 cursor-pointer transition-colors"
          >
            <svg class="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <span class="text-sm text-slate-500">Click to upload photos (up to 10)</span>
            <input type="file" accept="image/*" multiple @change="handleImageUpload" class="hidden" />
          </label>
          <p v-if="errors.images" class="text-xs text-danger mt-1">{{ errors.images[0] }}</p>
        </div>

        <!-- Rental Agreement -->
        <div class="rounded-xl border border-warm-200 bg-white/50 p-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1">Rental Agreement (optional)</label>
            <p class="text-xs text-warm-500 mb-3">Upload or replace a signed agreement document, or paste the agreement terms below.</p>

            <!-- Existing doc -->
            <div v-if="existingAgreement" class="flex items-center justify-between gap-3 rounded-xl bg-warm-100 border border-warm-200 px-4 py-3 mb-3">
              <div class="flex items-center gap-3 min-w-0">
                <svg class="w-5 h-5 text-warm-500 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span class="text-sm text-warm-800 font-medium truncate">{{ existingAgreement.split('/').pop() }}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <a :href="imageSrc(existingAgreement)" target="_blank" class="p-1.5 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </a>
                <button type="button" @click="removeExistingAgreement" class="p-1.5 text-warm-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- File upload -->
            <div v-if="!agreementFile">
              <label
                class="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-warm-200 hover:border-brand-300 bg-white/60 cursor-pointer transition-colors"
              >
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <span class="text-sm text-slate-500">Upload agreement document (PDF, DOC, DOCX, TXT — max 10 MB)</span>
                <input type="file" accept=".pdf,.doc,.docx,.txt" @change="handleAgreementUpload" class="hidden" />
              </label>
            </div>

            <!-- New file -->
            <div v-else class="flex items-center justify-between gap-3 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span class="text-sm text-warm-800 font-medium truncate">{{ agreementFile.name }}</span>
                <span class="text-xs text-warm-500 shrink-0">{{ (agreementFile.size / 1024).toFixed(0) }} KB</span>
              </div>
              <button
                type="button"
                @click="removeAgreementFile"
                class="p-1.5 text-warm-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="flex items-center gap-3 my-3">
              <div class="flex-1 border-t border-warm-200"></div>
              <span class="text-xs text-warm-400 font-medium">OR</span>
              <div class="flex-1 border-t border-warm-200"></div>
            </div>

            <!-- Paste text -->
            <textarea
              v-model="form.agreement_text"
              rows="5"
              placeholder="Paste rental agreement terms here (e.g. security deposit terms, damage policy, cancellation rules...)"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
            ></textarea>
            <p v-if="errors.agreement_text" class="text-xs text-danger mt-1">{{ errors.agreement_text[0] }}</p>
            <p v-if="errors.agreement_document" class="text-xs text-danger mt-1">{{ errors.agreement_document[0] }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button
            type="submit"
            :disabled="saving"
            class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:shadow-xl hover:shadow-brand-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Saving...' : 'Update Listing' }}
          </button>
          <button
            type="button"
            class="px-6 py-3.5 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-xl transition-colors text-sm font-medium"
            @click="router.push('/my-listings')"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>