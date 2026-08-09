<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { categoriesAPI, listingsAPI } from '../services/api.js'
import CalendarPicker from '../components/CalendarPicker.vue'
import AddressLocationPicker from '../components/AddressLocationPicker.vue'
import AiSmartValuerModal from '../components/AiSmartValuerModal.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()
const showAiModal = ref(false)

const form = ref({
  title: '',
  description: '',
  daily_rate: '',
  weekly_rate: '',
  monthly_rate: '',
  security_deposit: '',
  location: '',
  address: '',
  lat: null,
  lng: null,
  category_id: '',
  status: 'available',
  available_from: '',
  available_to: '',
  agreement_text: '',
})

function applyAiSuggestions(data) {
  if (data.title) form.value.title = data.title
  if (data.description) form.value.description = data.description
  if (data.daily_rate) form.value.daily_rate = data.daily_rate
  if (data.security_deposit) form.value.security_deposit = data.security_deposit
  toast.success('AI suggestions applied to your listing form!')
}
const imageFiles = ref([])
const imagePreviews = ref([])
const agreementFile = ref(null)
const submitting = ref(false)
const errors = ref({})
const categories = ref([])
const MAX_AGREEMENT_SIZE = 10 * 1024 * 1024

const canAddMore = computed(() => imageFiles.value.length < 10)

onMounted(async () => {
  try {
    const res = await categoriesAPI.getAll({ params: { flat: 1 } })
    categories.value = res.data?.data || res.data || []
  } catch {
    categories.value = []
  }
})

function handleImageUpload(e) {
  const files = Array.from(e.target.files || [])
  files.forEach((file) => {
    if (imageFiles.value.length >= 10) return
    imageFiles.value.push(file)
    const reader = new FileReader()
    reader.onload = (ev) => { imagePreviews.value.push(ev.target.result) }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

function removeImage(index) {
  imageFiles.value.splice(index, 1)
  imagePreviews.value.splice(index, 1)
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

async function submitForm() {
  submitting.value = true
  errors.value = {}
  try {
    // Upload new images first, get stored paths back
    let uploadedPaths = []
    if (imageFiles.value.length > 0) {
      const uploadRes = await listingsAPI.uploadImages(imageFiles.value)
      uploadedPaths = uploadRes.data?.paths || []
    }

    const fd = new FormData()
    Object.entries(form.value).forEach(([key, val]) => {
      if (val !== '' && val !== null) fd.append(key, val)
    })
    uploadedPaths.forEach((path) => fd.append('images[]', path))
    if (agreementFile.value) fd.append('agreement_document', agreementFile.value)
    await listingsAPI.create(fd)
    toast.success('Listing created successfully')
    router.push('/my-listings')
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors || {}
    } else {
      toast.error(e.response?.data?.message || 'Failed to create listing')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-10">
    <button
      @click="router.back()"
      class="flex items-center gap-2 text-sm text-warm-500 hover:text-brand-500 transition-colors font-medium mb-6"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back
    </button>

    <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-warm-900 mb-1">Create Listing</h1>
          <p class="text-sm text-warm-500">Share something from your home with your neighbors</p>
        </div>

        <!-- AI Assistant Banner Button -->
        <button
          type="button"
          @click="showAiModal = true"
          class="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-brand-500 to-yellow-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-white/20 shrink-0"
        >
          <svg class="w-4 h-4 text-white animate-bounce" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span>✨ AI Smart Valuer & Assistant</span>
        </button>
      </div>

      <form @submit.prevent="submitForm" class="space-y-5">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-warm-800 mb-1.5">Title</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="e.g. Power Drill, Mountain Bike..."
            class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
          />
          <p v-if="errors.title" class="text-xs text-danger mt-1">{{ errors.title[0] }}</p>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-warm-800 mb-1.5">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            placeholder="Describe the item, condition, any accessories included..."
            class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none"
          ></textarea>
          <p v-if="errors.description" class="text-xs text-danger mt-1">{{ errors.description[0] }}</p>
        </div>

        <!-- Price + Category -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Daily Price ($)</label>
            <input
              v-model="form.daily_rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
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
              placeholder="0.00"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Monthly Price ($)</label>
            <input
              v-model="form.monthly_rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Security Deposit ($)</label>
            <input
              v-model="form.security_deposit"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Category</label>
            <select
              v-model="form.category_id"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
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

        <!-- Location & Address Finder with Pin Picker Map -->
        <div class="space-y-4 pt-1 pb-2">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Neighborhood / City</label>
            <input
              v-model="form.location"
              type="text"
              placeholder="e.g. Park Slope, Brooklyn or San Francisco, CA"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
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

        <!-- Availability Range -->
        <CalendarPicker
          :model-value="{ start: form.available_from, end: form.available_to }"
          @update:model-value="(val) => { form.available_from = val.start || ''; form.available_to = val.end || '' }"
          label="Availability Range"
        />
        <p v-if="errors.available_from" class="text-xs text-danger mt-1">{{ errors.available_from[0] }}</p>
        <p v-if="errors.available_to" class="text-xs text-danger mt-1">{{ errors.available_to[0] }}</p>

        <!-- Images Upload -->
        <div>
          <label class="block text-sm font-medium text-warm-800 mb-1.5">Photos (max 10)</label>

          <!-- Preview grid -->
          <div v-if="imagePreviews.length > 0" class="grid grid-cols-3 gap-3 mb-3">
            <div
              v-for="(preview, index) in imagePreviews"
              :key="index"
              class="relative group"
            >
              <img :src="preview" class="w-full h-28 object-cover rounded-xl border border-warm-200" alt="Listing preview" />
              <button
                type="button"
                class="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow hover:bg-white transition-colors"
                @click="removeImage(index)"
              >
                <svg class="w-3.5 h-3.5 text-warm-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Add more tile -->
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

          <!-- Empty dropzone -->
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
        </div>

        <!-- Rental Agreement -->
        <div class="rounded-xl border border-warm-200 bg-white/50 p-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1">Rental Agreement (optional)</label>
            <p class="text-xs text-warm-500 mb-3">Upload a signed agreement document or paste the agreement terms below.</p>

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

            <!-- Selected file -->
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

        <!-- Submit -->
        <button
          type="submit"
          :disabled="submitting"
          class="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:shadow-xl hover:shadow-brand-500/25 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ submitting ? 'Creating...' : 'Create Listing' }}
        </button>
      </form>
    </div>

    <!-- AI Smart Valuer Modal -->
    <AiSmartValuerModal
      :is-open="showAiModal"
      :initial-title="form.title"
      :image-preview="imagePreviews[0] || ''"
      @close="showAiModal = false"
      @apply="applyAiSuggestions"
    />
  </div>
</template>