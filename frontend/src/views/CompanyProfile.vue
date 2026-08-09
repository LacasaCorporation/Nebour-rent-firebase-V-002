<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { companiesAPI } from '../services/api'
import { listingImageUrl } from '../utils/imageUrl'
import ShareButtons from '../components/ShareButtons.vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const { currentUser } = useAuthStore()
const toast = useToast()

const slug = route.params.slug as string

const company = ref<any>(null)
const loading = ref(true)
const notFound = ref(false)

// Edit state
const showEditModal = ref(false)
const saving = ref(false)
const editForm = ref({
  name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
})
const errors = ref<Record<string, string>>({})

// Delete state
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const isOwner = computed(() => currentUser.value && company.value && currentUser.value.id === company.value.owner_id)

onMounted(async () => {
  try {
    const { data } = await companiesAPI.get(slug)
    company.value = data
  } catch (err: any) {
    if (err.response?.status === 404) {
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
})

function openEditModal() {
  editForm.value = {
    name: company.value.name || '',
    description: company.value.description || '',
    address: company.value.address || '',
    phone: company.value.phone || '',
    email: company.value.email || '',
    website: company.value.website || '',
  }
  errors.value = {}
  showEditModal.value = true
}

async function saveCompany() {
  saving.value = true
  errors.value = {}
  try {
    const { data } = await companiesAPI.update(slug, editForm.value)
    company.value = { ...company.value, ...data }
    showEditModal.value = false
  } catch (err: any) {
    if (err.response?.status === 422) {
      const raw = err.response.data.errors
      errors.value = Object.fromEntries(Object.entries(raw).map(([k, v]: [string, any]) => [k, v[0]]))
    }
  } finally {
    saving.value = false
  }
}

async function deleteCompany() {
  deleting.value = true
  try {
    await companiesAPI.delete(slug)
    router.push('/company/dashboard')
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to delete company')
  } finally {
    deleting.value = false
  }
}

function formatRate(amount: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

function shareUrl() {
  return window.location.href
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-24 space-y-8">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Not Found -->
    <div v-else-if="notFound" class="text-center py-20">
      <h1 class="text-3xl font-bold text-warm-900 mb-2">Company not found</h1>
      <p class="text-warm-500">The company you're looking for doesn't exist or has been removed.</p>
    </div>

    <!-- Company Profile -->
    <div v-else-if="company" class="space-y-8">
      <!-- Header -->
      <div class="bg-white rounded-2xl border border-warm-200 p-8">
        <div class="flex flex-col sm:flex-row sm:items-start gap-6">
          <!-- Logo placeholder -->
          <div class="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span class="text-3xl font-bold text-brand-600">{{ company.name?.charAt(0)?.toUpperCase() }}</span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <h1 class="text-3xl font-bold text-warm-900">{{ company.name }}</h1>
              <!-- Owner actions -->
              <div v-if="isOwner" class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click="openEditModal"
                  class="px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  @click="showDeleteConfirm = true"
                  class="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            <p v-if="company.description" class="text-warm-500 mt-2 leading-relaxed">{{ company.description }}</p>

            <div class="flex flex-wrap items-center gap-4 mt-3 text-sm text-warm-400">
              <span v-if="company.address" class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {{ company.address }}
              </span>
              <span v-if="company.email" class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {{ company.email }}
              </span>
              <a v-if="company.website" :href="company.website" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1 hover:text-brand-600 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                {{ company.website.replace(/^https?:\/\//, '') }}
              </a>
            </div>

            <div class="flex items-center gap-4 mt-4 text-xs text-warm-400">
              <span>Managed by {{ company.owner?.name }}</span>
              <span>&middot;</span>
              <span>{{ company.total_listings ?? company.listings?.length ?? 0 }} listings</span>
              <span v-if="company.avg_rating">&middot;</span>
              <span v-if="company.avg_rating" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {{ company.avg_rating }}
              </span>
            </div>
          </div>
        </div>

        <!-- Share -->
        <div class="mt-6 pt-6 border-t border-warm-100 flex items-center gap-3">
          <span class="text-xs text-warm-400">Share this company:</span>
          <ShareButtons :title="company.name" :description="company.description" />
        </div>
      </div>

      <!-- Team Members -->
      <div v-if="company.users?.length" class="bg-white rounded-2xl border border-warm-200 p-6">
        <h2 class="text-lg font-bold text-warm-900 mb-4">Team Members</h2>
        <div class="flex flex-wrap gap-3">
          <div
            v-for="member in company.users"
            :key="member.id"
            class="flex items-center gap-2 px-3 py-2 bg-warm-50 rounded-xl"
          >
            <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-brand-600">{{ member.name?.charAt(0)?.toUpperCase() }}</span>
            </div>
            <span class="text-sm text-warm-700">{{ member.name }}</span>
            <span v-if="member.id === company.owner_id" class="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">Owner</span>
          </div>
        </div>
      </div>

      <!-- Listings -->
      <div>
        <h2 class="text-xl font-bold text-warm-900 mb-4">Available Listings</h2>

        <div v-if="!company.listings?.length" class="bg-white rounded-2xl border border-warm-200 p-8 text-center">
          <p class="text-warm-400">No available listings from this company yet.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <router-link
            v-for="listing in company.listings"
            :key="listing.id"
            :to="`/listings/${listing.id}`"
            class="bg-white rounded-2xl border border-warm-200 overflow-hidden hover:border-warm-300 hover:shadow-md transition-all group"
          >
            <div class="aspect-[4/3] overflow-hidden bg-warm-100">
              <img
                v-if="listing.images?.[0]"
                :src="listingImageUrl(listing.images[0])"
                :alt="listing.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <svg class="w-10 h-10 text-warm-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                </svg>
              </div>
            </div>

            <div class="p-4 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold text-warm-900 text-sm leading-tight group-hover:text-brand-600 transition-colors line-clamp-2">
                  {{ listing.title }}
                </h3>
              </div>

              <div class="flex items-center gap-2 text-xs text-warm-400">
                <span v-if="listing.category">{{ listing.category.name }}</span>
                <span v-if="listing.category && listing.location">&middot;</span>
                <span v-if="listing.location">{{ listing.location }}</span>
              </div>

              <div class="pt-2 border-t border-warm-100">
                <p class="text-brand-600 font-bold text-sm">
                  {{ formatRate(listing.daily_rate) }}
                  <span class="text-warm-400 font-normal">/day</span>
                </p>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showEditModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showEditModal = false">
          <div class="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl">
            <h3 class="text-lg font-bold text-warm-900">Edit Company</h3>

            <form @submit.prevent="saveCompany" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-warm-700 mb-1">Company name *</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  required
                  class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                  :class="{ 'border-red-400': errors.name }"
                />
                <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-700 mb-1">Description</label>
                <textarea v-model="editForm.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-700 mb-1">Address</label>
                <input v-model="editForm.address" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-warm-700 mb-1">Phone</label>
                  <input v-model="editForm.phone" type="tel" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-warm-700 mb-1">Email</label>
                  <input v-model="editForm.email" type="email" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-warm-700 mb-1">Website</label>
                <input v-model="editForm.website" type="url" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <button type="button" @click="showEditModal = false" class="px-4 py-2.5 text-sm text-warm-600 hover:text-warm-800">Cancel</button>
                <button type="submit" :disabled="saving" class="px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm disabled:opacity-50">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showDeleteConfirm = false">
          <div class="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-warm-900">Delete Company</h3>
                <p class="text-sm text-warm-500">This action cannot be undone.</p>
              </div>
            </div>

            <p class="text-sm text-warm-600">
              Are you sure you want to delete <strong>{{ company?.name }}</strong>? All associated listings will be unassigned.
            </p>

            <div class="flex justify-end gap-3">
              <button @click="showDeleteConfirm = false" class="px-4 py-2.5 text-sm text-warm-600 hover:text-warm-800">Cancel</button>
              <button
                @click="deleteCompany"
                :disabled="deleting"
                class="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                {{ deleting ? 'Deleting...' : 'Delete Company' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
