<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { companiesAPI, listingsAPI } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { listingImageUrl } from '../utils/imageUrl'
import Modal from '../components/Modal.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { authReady } = useAuthStore()
const toast = useToast()

const companies = ref<any[]>([])
const myListings = ref<any[]>([])
const selectedCompany = ref<any>(null)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const deleting = ref(false)

const emptyForm = {
  name: '',
  description: '',
  logo: null as File | null,
  cover_image: null as File | null,
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  latitude: null as number | null,
  longitude: null as number | null,
  phone: '',
  email: '',
  website: '',
  license_number: '',
  license_document: null as File | null,
  certifications: [] as string[],
  insurance_info: '',
  founded_year: null as number | null,
  agreement_text: '',
  payment_terms: '',
  bank_account_info: '',
  vat_number: '',
  company_images: [] as File[],
  existing_images: [] as string[],
  remove_images: [] as string[],
  offers: [] as any[],
  social_links: [] as any[],
  working_hours: [] as any[],
}

const form = ref<any>({ ...emptyForm, certifications: [], offers: [], social_links: [], working_hours: [] })
const errors = ref<Record<string, string>>({})

const companyListings = ref<any[]>([])
const loadingListings = ref(false)
const detailTab = ref<'overview' | 'listings' | 'team' | 'compliance'>('overview')

// Offer/benefit builder
const newOffer = ref('')
const newCert = ref('')
const offerCategories = ['Discount', 'Free Delivery', 'Insurance Included', 'Free Accessory', 'Seasonal', 'Package Deal']

// Social link builder (platform, url)
const newSocial = ref({ platform: '', url: '' })

// Working hours builder
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const workingHours = ref<Record<string, { open: string; close: string; closed: boolean }>>({})

function resetWorkingHours() {
  const wh: Record<string, { open: string; close: string; closed: boolean }> = {}
  weekdays.forEach((d) => {
    wh[d] = { open: '09:00', close: '18:00', closed: false }
  })
  return wh
}

const unattachedListings = computed(() =>
  myListings.value.filter((l) => !l.company_id || (selectedCompany.value && l.company_id !== selectedCompany.value.id))
)

onMounted(async () => {
  await authReady

  try {
    const compRes = await companiesAPI.myCompanies()
    companies.value = compRes.data
  } catch (err) {
    console.error('Failed to load companies:', err)
  }

  try {
    const listRes = await listingsAPI.getMyListings()
    const listData = listRes.data
    if (listData?.listings && Array.isArray(listData.listings)) {
      myListings.value = listData.listings
    } else if (listData?.data) {
      // Backward-compatible with plain paginator response
      myListings.value = listData.data
    } else if (Array.isArray(listData)) {
      myListings.value = listData
    } else {
      myListings.value = []
    }
  } catch (err) {
    console.error('Failed to load listings:', err)
  }

  loading.value = false
})

async function selectCompany(company: any) {
  selectedCompany.value = company
  detailTab.value = 'overview'
  loadingListings.value = true
  try {
    const [fullRes, listRes] = await Promise.all([
      companiesAPI.get(company.slug),
      companiesAPI.companyListings(company.slug),
    ])
    selectedCompany.value = fullRes.data
    companyListings.value = listRes.data.data || listRes.data
  } catch (err) {
    console.error(err)
  } finally {
    loadingListings.value = false
  }
}

function openCreateModal() {
  form.value = { ...emptyForm, certifications: [], offers: [], social_links: [], working_hours: resetWorkingHours() }
  errors.value = {}
  showCreateModal.value = true
}

function openEditModal() {
  if (!selectedCompany.value) return
  const c = selectedCompany.value
  form.value = {
    name: c.name || '',
    description: c.description || '',
    logo: null,
    cover_image: null,
    address: c.address || '',
    city: c.city || '',
    state: c.state || '',
    postal_code: c.postal_code || '',
    country: c.country || '',
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
    phone: c.phone || '',
    email: c.email || '',
    website: c.website || '',
    license_number: c.license_number || '',
    license_document: null,
    certifications: Array.isArray(c.certifications) ? [...c.certifications] : (c.certifications ? [c.certifications] : []),
    insurance_info: c.insurance_info || '',
    founded_year: c.founded_year ?? null,
    agreement_text: c.agreement_text || '',
    payment_terms: c.payment_terms || '',
    bank_account_info: c.bank_account_info || '',
    vat_number: c.vat_number || '',
    company_images: [],
    existing_images: Array.isArray(c.company_images) ? [...c.company_images] : [],
    remove_images: [],
    offers: Array.isArray(c.offers) ? [...c.offers] : [],
    social_links: Array.isArray(c.social_links) ? [...c.social_links] : [],
    working_hours: c.working_hours && typeof c.working_hours === 'object' && !Array.isArray(c.working_hours)
      ? { ...c.working_hours }
      : resetWorkingHours(),
  }
  errors.value = {}
  showEditModal.value = true
}

function buildFormData() {
  const fd = new FormData()
  const f = form.value

  fd.append('name', f.name)
  if (f.description) fd.append('description', f.description)
  if (f.logo) fd.append('logo', f.logo)
  if (f.cover_image) fd.append('cover_image', f.cover_image)
  if (f.address) fd.append('address', f.address)
  if (f.city) fd.append('city', f.city)
  if (f.state) fd.append('state', f.state)
  if (f.postal_code) fd.append('postal_code', f.postal_code)
  if (f.country) fd.append('country', f.country)
  if (f.latitude != null) fd.append('latitude', String(f.latitude))
  if (f.longitude != null) fd.append('longitude', String(f.longitude))
  if (f.phone) fd.append('phone', f.phone)
  if (f.email) fd.append('email', f.email)
  if (f.website) fd.append('website', f.website)
  if (f.license_number) fd.append('license_number', f.license_number)
  if (f.license_document) fd.append('license_document', f.license_document)
  if (f.certifications && f.certifications.length) fd.append('certifications', JSON.stringify(f.certifications))
  if (f.insurance_info) fd.append('insurance_info', f.insurance_info)
  if (f.founded_year) fd.append('founded_year', String(f.founded_year))
  if (f.agreement_text) fd.append('agreement_text', f.agreement_text)
  if (f.payment_terms) fd.append('payment_terms', f.payment_terms)
  if (f.bank_account_info) fd.append('bank_account_info', f.bank_account_info)
  if (f.vat_number) fd.append('vat_number', f.vat_number)

  // Gallery uploads
  if (f.company_images && f.company_images.length) {
    f.company_images.forEach((file: File) => fd.append('company_images[]', file))
  }

  // Images to remove (edit mode)
  if (f.remove_images && f.remove_images.length) {
    f.remove_images.forEach((img: string) => fd.append('remove_images[]', img))
  }

  // Offers
  if (f.offers && f.offers.length) fd.append('offers', JSON.stringify(f.offers))

  // Social links
  if (f.social_links && f.social_links.length) fd.append('social_links', JSON.stringify(f.social_links))

  // Working hours
  if (f.working_hours) fd.append('working_hours', JSON.stringify(f.working_hours))

  return fd
}

async function createCompany() {
  saving.value = true
  errors.value = {}
  try {
    const fd = buildFormData()
    const { data } = await companiesAPI.create(fd)
    companies.value.unshift(data)
    showCreateModal.value = false
    selectCompany(data)
  } catch (err: any) {
    if (err.response?.status === 422) {
      const raw = err.response.data.errors
      errors.value = Object.fromEntries(Object.entries(raw).map(([k, v]: [string, any]) => [k, v[0]]))
    }
  } finally {
    saving.value = false
  }
}

async function updateCompany() {
  if (!selectedCompany.value) return
  editing.value = true
  errors.value = {}
  try {
    const fd = buildFormData()
    const { data } = await companiesAPI.update(selectedCompany.value.slug, fd)
    const idx = companies.value.findIndex((c) => c.slug === selectedCompany.value.slug)
    if (idx !== -1) companies.value[idx] = { ...companies.value[idx], ...data }
    selectedCompany.value = { ...selectedCompany.value, ...data }
    showEditModal.value = false
  } catch (err: any) {
    if (err.response?.status === 422) {
      const raw = err.response.data.errors
      errors.value = Object.fromEntries(Object.entries(raw).map(([k, v]: [string, any]) => [k, v[0]]))
    } else {
      toast.error(err.response?.data?.message || 'Failed to update company')
    }
  } finally {
    editing.value = false
  }
}

async function deleteCompany() {
  if (!selectedCompany.value) return
  deleting.value = true
  try {
    await companiesAPI.delete(selectedCompany.value.slug)
    companies.value = companies.value.filter((c) => c.slug !== selectedCompany.value.slug)
    selectedCompany.value = null
    companyListings.value = []
    showDeleteConfirm.value = false
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to delete company')
  } finally {
    deleting.value = false
  }
}

async function attachListing(listingId: number) {
  if (!selectedCompany.value) return
  try {
    await companiesAPI.attachListing(selectedCompany.value.slug, listingId)
    const listing = myListings.value.find((l) => l.id === listingId)
    if (listing) listing.company_id = selectedCompany.value.id
    await selectCompany(selectedCompany.value)
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to attach listing')
  }
}

async function detachListing(listingId: number) {
  if (!selectedCompany.value) return
  try {
    await companiesAPI.detachListing(selectedCompany.value.slug, listingId)
    const listing = myListings.value.find((l) => l.id === listingId)
    if (listing) listing.company_id = null
    await selectCompany(selectedCompany.value)
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Failed to detach listing')
  }
}

function viewCompany(slug: string) {
  router.push(`/companies/${slug}`)
}

// --- Offer/social/hour helpers ---
function addOffer() {
  if (!newOffer.value.trim()) return
  form.value.offers.push(newOffer.value.trim())
  newOffer.value = ''
}
function removeOffer(idx: number | string) {
  form.value.offers.splice(Number(idx), 1)
}
function addCert() {
  if (!newCert.value.trim()) return
  form.value.certifications.push(newCert.value.trim())
  newCert.value = ''
}
function addSocial() {
  if (!newSocial.value.platform || !newSocial.value.url) return
  form.value.social_links.push({ ...newSocial.value })
  newSocial.value = { platform: '', url: '' }
}
function removeSocial(idx: number | string) {
  form.value.social_links.splice(Number(idx), 1)
}

// --- Image helpers ---
function onLogoChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) form.value.logo = target.files[0]
}
function onCoverChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) form.value.cover_image = target.files[0]
}
function onLicenseChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.[0]) form.value.license_document = target.files[0]
}
function onGalleryChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    form.value.company_images = Array.from(target.files)
  }
}
function removeExistingImage(img: string) {
  form.value.remove_images.push(img)
  form.value.existing_images = form.value.existing_images.filter((i: string) => i !== img)
}

function fileUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = import.meta.env.VITE_STORAGE_URL || import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:8000'
  return `${base}/storage/${path.replace(/^storage\//, '')}`
}

function licenseDocName(path: string) {
  if (!path) return ''
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function imgUrl(file: File) {
  return URL.createObjectURL(file)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-24 space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-warm-900">Company Dashboard</h1>
        <p class="text-warm-500 mt-1">Manage your companies, trust profile, and assigned listings.</p>
      </div>
      <button
        @click="openCreateModal"
        class="px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm"
      >
        + New Company
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="companies.length === 0 && !showCreateModal" class="text-center py-20 bg-white rounded-2xl border border-warm-200">
      <div class="w-16 h-16 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-warm-800 mb-1">No companies yet</h3>
      <p class="text-warm-500 text-sm mb-4">Create a company to build your trust profile and manage listings.</p>
      <button
        @click="openCreateModal"
        class="px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm"
      >
        Create your first company
      </button>
    </div>

    <!-- Main content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sidebar: companies list -->
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Your Companies</h2>
        <div
          v-for="c in companies"
          :key="c.id"
          @click="selectCompany(c)"
          class="p-4 bg-white rounded-xl border cursor-pointer transition-all"
          :class="selectedCompany?.id === c.id ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-warm-200 hover:border-warm-300'"
        >
          <div class="flex items-center gap-3">
            <img
              v-if="c.logo"
              :src="fileUrl(c.logo)"
              class="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            />
            <div v-else class="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-semibold text-brand-700">{{ (c.name || '?')[0] }}</span>
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-warm-900 text-sm truncate">{{ c.name }}</p>
              <p class="text-xs text-warm-400 mt-0.5">{{ c.listings_count ?? 0 }} listings</p>
            </div>
            <span
              v-if="c.is_verified"
              class="ml-auto text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0"
            >
              ✓ Verified
            </span>
          </div>
        </div>
      </div>

      <!-- Main panel -->
      <div class="lg:col-span-2">
        <!-- No company selected -->
        <div v-if="!selectedCompany" class="bg-white rounded-2xl border border-warm-200 p-8 text-center">
          <p class="text-warm-400">Select a company from the list to manage its trust profile and listings.</p>
        </div>

        <!-- Company detail -->
        <div v-else class="space-y-6">
          <!-- Company header card -->
          <div class="bg-white rounded-2xl border border-warm-200 overflow-hidden">
            <!-- Cover image -->
            <div v-if="selectedCompany.cover_image" class="h-28 bg-cover bg-center" :style="{ backgroundImage: `url(${fileUrl(selectedCompany.cover_image)})` }"></div>
            <div v-else class="h-20 bg-gradient-to-r from-brand-500/10 to-warm-100"></div>

            <div class="p-6 pt-4">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-4">
                  <img
                    v-if="selectedCompany.logo"
                    :src="fileUrl(selectedCompany.logo)"
                    class="w-14 h-14 rounded-2xl object-cover border border-warm-100 flex-shrink-0"
                  />
                  <div v-else class="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <span class="text-lg font-bold text-brand-700">{{ (selectedCompany.name || '?')[0] }}</span>
                  </div>
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="text-xl font-bold text-warm-900">{{ selectedCompany.name }}</h3>
                      <span
                        v-if="selectedCompany.is_verified"
                        class="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"
                      >
                        ✓ Verified
                      </span>
                      <span
                        v-if="selectedCompany.founded_year"
                        class="text-xs text-warm-400 bg-warm-50 px-2 py-0.5 rounded-full"
                      >
                        Est. {{ selectedCompany.founded_year }}
                      </span>
                    </div>
                    <p v-if="selectedCompany.description" class="text-warm-500 text-sm mt-1 max-w-lg">{{ selectedCompany.description }}</p>
                    <div class="flex items-center gap-3 mt-2 text-xs text-warm-400 flex-wrap">
                      <span v-if="selectedCompany.address">
                        {{ [selectedCompany.address, selectedCompany.city, selectedCompany.country].filter(Boolean).join(', ') }}
                      </span>
                      <span v-if="selectedCompany.phone">· {{ selectedCompany.phone }}</span>
                      <span v-if="selectedCompany.email">· {{ selectedCompany.email }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-4">
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
                  <button
                    @click="viewCompany(selectedCompany.slug)"
                    class="text-sm text-warm-400 hover:text-brand-600 font-medium"
                  >
                    View &rarr;
                  </button>
                </div>
              </div>

              <!-- Trust badges strip -->
              <div v-if="selectedCompany.license_number || selectedCompany.certifications?.length || selectedCompany.insurance_info" class="mt-4 pt-4 border-t border-warm-100 flex flex-wrap gap-2">
                <span
                  v-if="selectedCompany.license_number"
                  class="text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full"
                >
                  📋 Licensed
                </span>
                <span
                  v-if="selectedCompany.insurance_info"
                  class="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full"
                >
                  🛡️ Insured
                </span>
                <span
                  v-for="cert in (Array.isArray(selectedCompany.certifications) ? selectedCompany.certifications.slice(0, 3) : [selectedCompany.certifications]).filter(Boolean)"
                  :key="cert"
                  class="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full"
                >
                  ⭐ {{ cert }}
                </span>
                <span
                  v-if="selectedCompany.vat_number"
                  class="text-xs text-warm-500 bg-warm-50 px-2.5 py-1 rounded-full"
                >
                  VAT: {{ selectedCompany.vat_number }}
                </span>
              </div>
            </div>
          </div>

          <!-- Stats row -->
          <div class="grid grid-cols-4 gap-4">
            <div class="bg-white rounded-xl border border-warm-200 p-4 text-center">
              <p class="text-2xl font-bold text-warm-900">{{ selectedCompany.total_listings ?? selectedCompany.listings_count ?? 0 }}</p>
              <p class="text-xs text-warm-400 mt-0.5">Total listings</p>
            </div>
            <div class="bg-white rounded-xl border border-warm-200 p-4 text-center">
              <p class="text-2xl font-bold text-green-600">{{ selectedCompany.available_listings ?? 0 }}</p>
              <p class="text-xs text-warm-400 mt-0.5">Available</p>
            </div>
            <div class="bg-white rounded-xl border border-warm-200 p-4 text-center">
              <p class="text-2xl font-bold text-brand-600">{{ selectedCompany.total_rentals ?? 0 }}</p>
              <p class="text-xs text-warm-400 mt-0.5">Total rentals</p>
            </div>
            <div class="bg-white rounded-xl border border-warm-200 p-4 text-center">
              <p class="text-2xl font-bold text-amber-500">{{ selectedCompany.avg_rating != null ? Number(selectedCompany.avg_rating).toFixed(1) : '—' }}</p>
              <p class="text-xs text-warm-400 mt-0.5">Avg rating</p>
            </div>
          </div>

          <!-- Tab bar -->
          <div class="bg-white rounded-2xl border border-warm-200">
            <div class="flex border-b border-warm-100 overflow-x-auto">
              <button
                v-for="tab in (['overview', 'listings', 'team', 'compliance'] as const)"
                :key="tab"
                @click="detailTab = tab"
                class="px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                :class="detailTab === tab ? 'text-brand-600 border-b-2 border-brand-500' : 'text-warm-400 hover:text-warm-600'"
              >
                {{ tab === 'overview' ? 'Overview' : tab === 'listings' ? `Listings (${companyListings.length})` : tab === 'team' ? `Team (${selectedCompany.users?.length ?? 0})` : 'Compliance' }}
              </button>
            </div>

            <div class="p-6">
              <!-- Overview tab -->
              <div v-if="detailTab === 'overview'" class="space-y-6">
                <div class="grid grid-cols-2 gap-6">
                  <!-- Contact info -->
                  <div class="space-y-4">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Contact & Location</h4>
                    <dl class="space-y-2 text-sm">
                      <div v-if="selectedCompany.email" class="flex gap-2">
                        <dt class="text-warm-400 flex-shrink-0 w-16">Email</dt>
                        <dd class="text-warm-800">{{ selectedCompany.email }}</dd>
                      </div>
                      <div v-if="selectedCompany.phone" class="flex gap-2">
                        <dt class="text-warm-400 flex-shrink-0 w-16">Phone</dt>
                        <dd class="text-warm-800">{{ selectedCompany.phone }}</dd>
                      </div>
                      <div v-if="selectedCompany.website" class="flex gap-2">
                        <dt class="text-warm-400 flex-shrink-0 w-16">Website</dt>
                        <dd>
                          <a :href="selectedCompany.website" target="_blank" class="text-brand-600 hover:underline">{{ selectedCompany.website }}</a>
                        </dd>
                      </div>
                      <div v-if="selectedCompany.address" class="flex gap-2">
                        <dt class="text-warm-400 flex-shrink-0 w-16">Address</dt>
                        <dd class="text-warm-800">
                          {{ selectedCompany.address }}
                          <span v-if="selectedCompany.city">, {{ selectedCompany.city }}</span>
                          <span v-if="selectedCompany.state">, {{ selectedCompany.state }}</span>
                          <span v-if="selectedCompany.postal_code">, {{ selectedCompany.postal_code }}</span>
                          <span v-if="selectedCompany.country">, {{ selectedCompany.country }}</span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <!-- Owner info -->
                  <div class="space-y-4">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Owner</h4>
                    <div v-if="selectedCompany.owner" class="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
                      <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-sm font-semibold text-brand-700">{{ (selectedCompany.owner.name || '?')[0] }}</span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-warm-800">{{ selectedCompany.owner.name }}</p>
                        <p class="text-xs text-warm-400">{{ selectedCompany.owner.email }}</p>
                      </div>
                    </div>
                    <p v-else class="text-sm text-warm-400">No owner assigned.</p>
                  </div>
                </div>

                <!-- Description full -->
                <div v-if="selectedCompany.description" class="space-y-2">
                  <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">About</h4>
                  <p class="text-sm text-warm-700 leading-relaxed">{{ selectedCompany.description }}</p>
                </div>

                <!-- Offers / Benefits -->
                <div v-if="selectedCompany.offers?.length" class="space-y-3">
                  <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Offers & Benefits</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      v-for="offer in selectedCompany.offers"
                      :key="offer"
                      class="flex items-center gap-2 text-sm text-warm-700 bg-warm-50 rounded-xl px-3 py-2"
                    >
                      <span class="text-brand-500">✦</span> {{ offer }}
                    </div>
                  </div>
                </div>

                <!-- Social links -->
                <div v-if="selectedCompany.social_links?.length" class="space-y-2">
                  <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Social</h4>
                  <div class="flex flex-wrap gap-2">
                    <a
                      v-for="link in selectedCompany.social_links"
                      :key="link.platform"
                      :href="link.url"
                      target="_blank"
                      class="text-xs font-medium text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors"
                    >
                      {{ link.platform }}
                    </a>
                  </div>
                </div>

                <!-- Working hours -->
                <div v-if="selectedCompany.working_hours && typeof selectedCompany.working_hours === 'object'" class="space-y-2">
                  <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Working Hours</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div
                      v-for="(hours, day) in selectedCompany.working_hours"
                      :key="day"
                      class="flex items-center justify-between text-sm py-1.5 px-3 bg-warm-50 rounded-lg"
                    >
                      <span class="text-warm-600">{{ day }}</span>
                      <span class="text-warm-800 font-medium">
                        {{ hours.closed ? 'Closed' : `${hours.open} – ${hours.close}` }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Company gallery -->
                <div v-if="selectedCompany.company_images?.length" class="space-y-3">
                  <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Gallery</h4>
                  <div class="grid grid-cols-3 gap-2">
                    <img
                      v-for="img in selectedCompany.company_images"
                      :key="img"
                      :src="fileUrl(img)"
                      class="w-full h-24 object-cover rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <!-- Listings tab -->
              <div v-else-if="detailTab === 'listings'" class="space-y-4">
                <div v-if="loadingListings" class="flex justify-center py-8">
                  <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>

                <div v-else-if="companyListings.length === 0 && unattachedListings.length === 0" class="text-sm text-warm-400 py-8 text-center">
                  No listings assigned to this company yet.
                </div>

                <template v-else>
                  <div v-if="companyListings.length > 0" class="space-y-2">
                    <div
                      v-for="listing in companyListings"
                      :key="listing.id"
                      class="flex items-center justify-between p-3 bg-warm-50 rounded-xl"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <img
                          v-if="listing.images?.[0]"
                          :src="listingImageUrl(listing.images[0])"
                          class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-warm-800 truncate">{{ listing.title }}</p>
                          <p class="text-xs text-warm-400">{{ listing.category?.name || 'Uncategorized' }}</p>
                        </div>
                      </div>
                      <button
                        @click="detachListing(listing.id)"
                        class="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0 ml-3"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <!-- Attach section inline -->
                  <div v-if="unattachedListings.length > 0" class="mt-6 pt-4 border-t border-warm-100 space-y-3">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Attach your other listings</h4>
                    <div
                      v-for="listing in unattachedListings"
                      :key="listing.id"
                      class="flex items-center justify-between p-3 bg-warm-50 rounded-xl"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <img
                          v-if="listing.images?.[0]"
                          :src="listingImageUrl(listing.images[0])"
                          class="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-warm-800 truncate">{{ listing.title }}</p>
                          <p class="text-xs text-warm-400">{{ listing.category?.name || 'Uncategorized' }}</p>
                        </div>
                      </div>
                      <button
                        @click="attachListing(listing.id)"
                        class="text-xs text-brand-600 hover:text-brand-700 font-medium flex-shrink-0 ml-3"
                      >
                        Attach
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Team tab -->
              <div v-else-if="detailTab === 'team'" class="space-y-4">
                <div v-if="!selectedCompany.users || selectedCompany.users.length === 0" class="text-sm text-warm-400 py-8 text-center">
                  No team members yet.
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="user in selectedCompany.users"
                    :key="user.id"
                    class="flex items-center justify-between p-3 bg-warm-50 rounded-xl"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <span class="text-sm font-semibold text-brand-700">{{ (user.name || '?')[0] }}</span>
                      </div>
                      <div>
                        <p class="text-sm font-medium text-warm-800">{{ user.name }}</p>
                        <p class="text-xs text-warm-400">{{ user.email }}</p>
                      </div>
                    </div>
                    <span
                      v-if="selectedCompany.owner_id === user.id"
                      class="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"
                    >
                      Owner
                    </span>
                  </div>
                </div>
              </div>

              <!-- Compliance tab -->
              <div v-else-if="detailTab === 'compliance'" class="space-y-6">
                <div v-if="!selectedCompany.license_number && !selectedCompany.certifications?.length && !selectedCompany.insurance_info && !selectedCompany.license_document && !selectedCompany.vat_number && !selectedCompany.agreement_text && !selectedCompany.payment_terms" class="text-sm text-warm-400 py-8 text-center">
                  No compliance information yet. Click "Edit" to add license, insurance, and legal details that build trust with renters.
                </div>

                <template v-else>
                  <!-- License block -->
                  <div v-if="selectedCompany.license_number || selectedCompany.license_document" class="space-y-3">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">License</h4>
                    <div class="bg-warm-50 rounded-2xl p-4 space-y-2">
                      <div v-if="selectedCompany.license_number" class="flex items-center justify-between">
                        <span class="text-sm text-warm-600">License number</span>
                        <span class="text-sm font-semibold text-warm-900">{{ selectedCompany.license_number }}</span>
                      </div>
                      <div v-if="selectedCompany.license_document" class="flex items-center justify-between">
                        <span class="text-sm text-warm-600">License document</span>
                        <a
                          :href="fileUrl(selectedCompany.license_document)"
                          target="_blank"
                          class="text-sm font-medium text-brand-600 hover:underline flex items-center gap-1"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {{ licenseDocName(selectedCompany.license_document) }}
                        </a>
                      </div>
                    </div>
                  </div>

                  <!-- Certifications -->
                  <div v-if="selectedCompany.certifications?.length" class="space-y-2">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Certifications</h4>
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="cert in (Array.isArray(selectedCompany.certifications) ? selectedCompany.certifications : [selectedCompany.certifications]).filter(Boolean)"
                        :key="cert"
                        class="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full"
                      >
                        ⭐ {{ cert }}
                      </span>
                    </div>
                  </div>

                  <!-- Insurance -->
                  <div v-if="selectedCompany.insurance_info" class="space-y-2">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Insurance</h4>
                    <div class="bg-green-50 border border-green-100 rounded-2xl p-4">
                      <p class="text-sm text-green-800 leading-relaxed">{{ selectedCompany.insurance_info }}</p>
                    </div>
                  </div>

                  <!-- VAT -->
                  <div v-if="selectedCompany.vat_number" class="space-y-2">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Tax / VAT</h4>
                    <div class="bg-warm-50 rounded-2xl p-4 flex items-center justify-between">
                      <span class="text-sm text-warm-600">VAT number</span>
                      <span class="text-sm font-semibold text-warm-900">{{ selectedCompany.vat_number }}</span>
                    </div>
                  </div>

                  <!-- Legal terms grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div v-if="selectedCompany.agreement_text" class="space-y-2">
                      <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Rental Agreement</h4>
                      <div class="bg-warm-50 rounded-2xl p-4 max-h-40 overflow-y-auto">
                        <p class="text-sm text-warm-700 whitespace-pre-wrap leading-relaxed">{{ selectedCompany.agreement_text }}</p>
                      </div>
                    </div>
                    <div v-if="selectedCompany.payment_terms" class="space-y-2">
                      <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Payment Terms</h4>
                      <div class="bg-warm-50 rounded-2xl p-4 max-h-40 overflow-y-auto">
                        <p class="text-sm text-warm-700 whitespace-pre-wrap leading-relaxed">{{ selectedCompany.payment_terms }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Bank info (owner only, masked) -->
                  <div v-if="selectedCompany.bank_account_info" class="space-y-2">
                    <h4 class="text-sm font-semibold text-warm-500 uppercase tracking-wide">Payout Account</h4>
                    <div class="bg-warm-50 rounded-2xl p-4">
                      <p class="text-sm text-warm-700">{{ selectedCompany.bank_account_info }}</p>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Modal :show="showCreateModal" title="New Company" maxWidth="max-w-2xl" @close="showCreateModal = false">
      <form @submit.prevent="createCompany" class="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Company name *</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="e.g. Downtown Rentals"
            class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            :class="{ 'border-red-400': errors.name }"
          />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Description</label>
          <textarea v-model="form.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
        </div>

        <!-- Logo & cover uploads -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Company logo</label>
            <input type="file" accept="image/*" @change="onLogoChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Cover image</label>
            <input type="file" accept="image/*" @change="onCoverChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
          </div>
        </div>

        <!-- Address block -->
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-warm-700 mb-1">Address</label>
            <input v-model="form.address" type="text" placeholder="123 Main St" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">City</label>
            <input v-model="form.city" type="text" placeholder="Toronto" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">State / Province</label>
            <input v-model="form.state" type="text" placeholder="ON" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Postal code</label>
            <input v-model="form.postal_code" type="text" placeholder="M5V 2T6" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Country</label>
            <input v-model="form.country" type="text" placeholder="Canada" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Phone</label>
            <input v-model="form.phone" type="tel" placeholder="(416) 555-0123" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Email</label>
            <input v-model="form.email" type="email" placeholder="info@company.com" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Website</label>
          <input v-model="form.website" type="url" placeholder="https://example.com" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
        </div>

        <!-- Compliance fields -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Trust & Compliance</h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">License number</label>
              <input v-model="form.license_number" type="text" placeholder="e.g. RTA-123456" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">Founded year</label>
              <input v-model.number="form.founded_year" type="number" min="1900" :max="new Date().getFullYear()" placeholder="2015" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
          </div>

          <div class="mt-3">
            <label class="block text-sm font-medium text-warm-700 mb-1">License document</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" @change="onLicenseChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
            <p v-if="errors.license_document" class="text-red-500 text-xs mt-1">{{ errors.license_document }}</p>
          </div>

          <div class="mt-3">
            <label class="block text-sm font-medium text-warm-700 mb-1">Certifications</label>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="(cert, i) in form.certifications"
                :key="i"
                class="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full"
              >
                {{ cert }}
                <button type="button" @click="form.certifications.splice(i, 1)" class="text-amber-400 hover:text-amber-600">&times;</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="newCert"
                type="text"
                placeholder="e.g. Safety Standard Certified"
                class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                @keydown.enter.prevent="addCert"
              />
              <button
                type="button"
                @click="addCert"
                class="px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors flex-shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          <div class="mt-3">
            <label class="block text-sm font-medium text-warm-700 mb-1">Insurance info</label>
            <textarea v-model="form.insurance_info" rows="2" placeholder="e.g. Fully insured up to $2M liability" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
          </div>

          <div class="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">VAT number</label>
              <input v-model="form.vat_number" type="text" placeholder="GST/HST number" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">Payout / bank info</label>
              <input v-model="form.bank_account_info" type="text" placeholder="Bank & account" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
          </div>
        </div>

        <!-- Offers -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Offers & Benefits</h4>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="(offer, i) in form.offers"
              :key="i"
              class="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full"
            >
              {{ offer }}
              <button type="button" @click="removeOffer(i)" class="text-brand-300 hover:text-brand-500">&times;</button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="newOffer"
              type="text"
              placeholder="e.g. 10% off for first-time renters"
              class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
              @keydown.enter.prevent="addOffer"
            />
            <button
              type="button"
              @click="addOffer"
              class="px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Social links -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Social Links</h4>
          <div class="flex gap-1.5 flex-wrap mb-2">
            <span
              v-for="(link, i) in form.social_links"
              :key="i"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full"
            >
              {{ link.platform }}
              <a :href="link.url" target="_blank" class="text-brand-400 hover:text-brand-600">↗</a>
              <button type="button" @click="removeSocial(i)" class="text-brand-300 hover:text-brand-500">&times;</button>
            </span>
          </div>
          <div class="grid grid-cols-[1fr_2fr_auto] gap-2">
            <input
              v-model="newSocial.platform"
              type="text"
              placeholder="Instagram"
              class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            />
            <input
              v-model="newSocial.url"
              type="url"
              placeholder="https://instagram.com/..."
              class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            />
            <button
              type="button"
              @click="addSocial"
              class="px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Working hours -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Working Hours</h4>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="day in weekdays"
              :key="day"
              class="flex items-center gap-2 p-2 bg-warm-50 rounded-lg"
            >
              <label class="flex items-center gap-1.5 w-24 text-xs font-medium text-warm-600">
                <input type="checkbox" v-model="form.working_hours[day].closed" class="rounded text-brand-500" />
                {{ day }}
              </label>
              <template v-if="!form.working_hours[day].closed">
                <input v-model="form.working_hours[day].open" type="time" class="text-xs px-2 py-1 rounded-lg border border-warm-200 focus:border-brand-500 outline-none" />
                <span class="text-xs text-warm-400">–</span>
                <input v-model="form.working_hours[day].close" type="time" class="text-xs px-2 py-1 rounded-lg border border-warm-200 focus:border-brand-500 outline-none" />
              </template>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showCreateModal = false" class="px-4 py-2.5 text-sm text-warm-600 hover:text-warm-800">Cancel</button>
          <button type="submit" :disabled="saving" class="px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm disabled:opacity-50">
            {{ saving ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal :show="showEditModal" title="Edit Company" maxWidth="max-w-2xl" @close="showEditModal = false">
      <form @submit.prevent="updateCompany" class="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Company name *</label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            :class="{ 'border-red-400': errors.name }"
          />
          <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Description</label>
          <textarea v-model="form.description" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
        </div>

        <!-- Logo & cover uploads -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">
              Company logo
              <span v-if="selectedCompany?.logo" class="text-xs text-warm-400 font-normal"> (current)</span>
            </label>
            <input type="file" accept="image/*" @change="onLogoChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">
              Cover image
              <span v-if="selectedCompany?.cover_image" class="text-xs text-warm-400 font-normal"> (current)</span>
            </label>
            <input type="file" accept="image/*" @change="onCoverChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
          </div>
        </div>

        <!-- Address block -->
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-warm-700 mb-1">Address</label>
            <input v-model="form.address" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">City</label>
            <input v-model="form.city" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">State / Province</label>
            <input v-model="form.state" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Postal code</label>
            <input v-model="form.postal_code" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Country</label>
            <input v-model="form.country" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Phone</label>
            <input v-model="form.phone" type="tel" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Email</label>
            <input v-model="form.email" type="email" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Website</label>
          <input v-model="form.website" type="url" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
        </div>

        <!-- Compliance fields -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Trust & Compliance</h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">License number</label>
              <input v-model="form.license_number" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">Founded year</label>
              <input v-model.number="form.founded_year" type="number" min="1900" :max="new Date().getFullYear()" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
          </div>

          <div class="mt-3">
            <label class="block text-sm font-medium text-warm-700 mb-1">
              License document
              <span v-if="selectedCompany?.license_document" class="text-xs text-warm-400 font-normal"> (current)</span>
            </label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" @change="onLicenseChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
            <p v-if="errors.license_document" class="text-red-500 text-xs mt-1">{{ errors.license_document }}</p>
          </div>

          <div class="mt-3">
            <label class="block text-sm font-medium text-warm-700 mb-1">Certifications</label>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="(cert, i) in form.certifications"
                :key="i"
                class="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full"
              >
                {{ cert }}
                <button type="button" @click="form.certifications.splice(i, 1)" class="text-amber-400 hover:text-amber-600">&times;</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="newCert"
                type="text"
                placeholder="e.g. Safety Standard Certified"
                class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
                @keydown.enter.prevent="addCert"
              />
              <button
                type="button"
                @click="addCert"
                class="px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors flex-shrink-0"
              >
                Add
              </button>
            </div>
          </div>

          <div class="mt-3">
            <label class="block text-sm font-medium text-warm-700 mb-1">Insurance info</label>
            <textarea v-model="form.insurance_info" rows="2" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
          </div>

          <div class="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">VAT number</label>
              <input v-model="form.vat_number" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-warm-700 mb-1">Payout / bank info</label>
              <input v-model="form.bank_account_info" type="text" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm" />
            </div>
          </div>
        </div>

        <!-- Gallery management -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Gallery</h4>
          <div v-if="form.existing_images.length" class="grid grid-cols-3 gap-2 mb-3">
            <div v-for="img in form.existing_images" :key="img" class="relative group">
              <img :src="fileUrl(img)" class="w-full h-20 object-cover rounded-xl" />
              <button
                type="button"
                @click="removeExistingImage(img)"
                class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          </div>
          <input type="file" accept="image/*" multiple @change="onGalleryChange" class="w-full text-sm text-warm-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-medium file:hover:bg-brand-100 file:transition-colors" />
          <div v-if="form.company_images.length" class="mt-2">
            <p class="text-xs text-warm-400">Adding {{ form.company_images.length }} new image(s)</p>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <img
                v-for="(file, i) in form.company_images"
                :key="i"
                :src="imgUrl(file)"
                class="w-full h-20 object-cover rounded-xl"
              />
            </div>
          </div>
        </div>

        <!-- Offers -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Offers & Benefits</h4>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span
              v-for="(offer, i) in form.offers"
              :key="i"
              class="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full"
            >
              {{ offer }}
              <button type="button" @click="removeOffer(i)" class="text-brand-300 hover:text-brand-500">&times;</button>
            </span>
          </div>
          <div class="flex gap-2">
            <input
              v-model="newOffer"
              type="text"
              placeholder="e.g. 10% off for first-time renters"
              class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
              @keydown.enter.prevent="addOffer"
            />
            <button
              type="button"
              @click="addOffer"
              class="px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Social links -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Social Links</h4>
          <div class="flex gap-1.5 flex-wrap mb-2">
            <span
              v-for="(link, i) in form.social_links"
              :key="i"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full"
            >
              {{ link.platform }}
              <a :href="link.url" target="_blank" class="text-brand-400 hover:text-brand-600">↗</a>
              <button type="button" @click="removeSocial(i)" class="text-brand-300 hover:text-brand-500">&times;</button>
            </span>
          </div>
          <div class="grid grid-cols-[1fr_2fr_auto] gap-2">
            <input
              v-model="newSocial.platform"
              type="text"
              placeholder="Instagram"
              class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            />
            <input
              v-model="newSocial.url"
              type="url"
              placeholder="https://instagram.com/..."
              class="w-full px-4 py-2 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            />
            <button
              type="button"
              @click="addSocial"
              class="px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Working hours -->
        <div class="pt-4 border-t border-warm-100">
          <h4 class="text-sm font-semibold text-warm-800 mb-3">Working Hours</h4>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="day in weekdays"
              :key="day"
              class="flex items-center gap-2 p-2 bg-warm-50 rounded-lg"
            >
              <label class="flex items-center gap-1.5 w-24 text-xs font-medium text-warm-600">
                <input type="checkbox" v-model="form.working_hours[day].closed" class="rounded text-brand-500" />
                {{ day }}
              </label>
              <template v-if="!form.working_hours[day].closed">
                <input v-model="form.working_hours[day].open" type="time" class="text-xs px-2 py-1 rounded-lg border border-warm-200 focus:border-brand-500 outline-none" />
                <span class="text-xs text-warm-400">–</span>
                <input v-model="form.working_hours[day].close" type="time" class="text-xs px-2 py-1 rounded-lg border border-warm-200 focus:border-brand-500 outline-none" />
              </template>
            </div>
          </div>
        </div>

        <!-- Legal text fields -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Rental agreement text</label>
            <textarea v-model="form.agreement_text" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-700 mb-1">Payment terms</label>
            <textarea v-model="form.payment_terms" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none" />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showEditModal = false" class="px-4 py-2.5 text-sm text-warm-600 hover:text-warm-800">Cancel</button>
          <button type="submit" :disabled="editing" class="px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors text-sm disabled:opacity-50">
            {{ editing ? 'Saving...' : 'Save changes' }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal :show="showDeleteConfirm" maxWidth="max-w-sm" @close="showDeleteConfirm = false">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-warm-900">Delete company?</h3>
            <p class="text-sm text-warm-500 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p class="text-sm text-warm-600">
          <strong>{{ selectedCompany?.name }}</strong> will be permanently deleted along with all its data.
        </p>
        <div class="flex justify-end gap-3 pt-2">
          <button @click="showDeleteConfirm = false" class="px-4 py-2.5 text-sm text-warm-600 hover:text-warm-800">Cancel</button>
          <button @click="deleteCompany" :disabled="deleting" class="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm disabled:opacity-50">
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>