<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { userAPI, categoriesAPI } from '../services/api.js'
import FavoritesTab from './settings/FavoritesTab.vue'
import SavedSearchesTab from './settings/SavedSearchesTab.vue'
import ReviewsTab from './settings/ReviewsTab.vue'
import NotificationsTab from './settings/NotificationsTab.vue'
import RentalsTab from './settings/RentalsTab.vue'

const parentCategories = ref([])

const authStore = useAuthStore()
const user = computed(() => authStore.currentUser.value)

const profileForm = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  avatar: null,
})
const avatarPreview = ref(null)
const avatarInput = ref(null)
const profileSaving = ref(false)
const profileSuccess = ref(false)
const profileError = ref('')

const passwordForm = ref({
  current_password: '',
  password: '',
  password_confirmation: '',
})
const passwordSaving = ref(false)
const passwordSuccess = ref(false)
const passwordError = ref('')

// Categories
const categories = ref([])
const categoriesLoading = ref(false)
const categoryForm = ref({ name: '', icon: '', parent_id: '' })
const categorySaving = ref(false)
const categoryEditingId = ref(null)
const categoryError = ref('')
const categorySuccess = ref('')
const categoryDeleteId = ref(null)

const activeTab = ref('profile')
const tabItems = [
  { key: 'profile', label: 'Profile' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'savedSearches', label: 'Saved Searches' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'rentals', label: 'Rentals' },
  { key: 'categories', label: 'Categories' },
]

function initForm() {
  if (user.value) {
    profileForm.value.name = user.value.name || ''
    profileForm.value.email = user.value.email || ''
    profileForm.value.phone = user.value.phone || ''
    profileForm.value.address = user.value.address || ''
    if (user.value.avatar) {
      avatarPreview.value = `/storage/${user.value.avatar}`
    }
  }
}

watch(user, () => { initForm() }, { immediate: true })

function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return
  profileForm.value.avatar = file
  avatarPreview.value = URL.createObjectURL(file)
}

function removeAvatar() {
  profileForm.value.avatar = ''
  avatarPreview.value = null
  if (avatarInput.value) avatarInput.value.value = ''
}

async function saveProfile() {
  profileSaving.value = true
  profileSuccess.value = false
  profileError.value = ''

  try {
    const fd = new FormData()
    fd.append('name', profileForm.value.name)
    fd.append('email', profileForm.value.email)
    fd.append('phone', profileForm.value.phone)
    fd.append('address', profileForm.value.address)
    if (profileForm.value.avatar instanceof File) {
      fd.append('avatar', profileForm.value.avatar)
    }

    const res = await userAPI.updateProfile(fd)
    await authStore.fetchUser()
    profileSuccess.value = true
    setTimeout(() => { profileSuccess.value = false }, 3000)
  } catch (e) {
    profileError.value = e.response?.data?.message || 'Failed to update profile.'
  } finally {
    profileSaving.value = false
  }
}

async function savePassword() {
  passwordSaving.value = true
  passwordSuccess.value = false
  passwordError.value = ''

  try {
    await userAPI.changePassword({
      current_password: passwordForm.value.current_password,
      password: passwordForm.value.password,
      password_confirmation: passwordForm.value.password_confirmation,
    })
    passwordSuccess.value = true
    passwordForm.value = { current_password: '', password: '', password_confirmation: '' }
    setTimeout(() => { passwordSuccess.value = false }, 3000)
  } catch (e) {
    passwordError.value = e.response?.data?.message || e.response?.data?.errors?.password?.[0] || 'Failed to change password.'
  } finally {
    passwordSaving.value = false
  }
}

// Categories methods
async function fetchCategories() {
  categoriesLoading.value = true
  try {
    const res = await categoriesAPI.getAll({ params: { flat: 1 } })
    categories.value = res.data
    parentCategories.value = res.data.filter(c => !c.parent_id)
  } catch (e) {
    console.error('Failed to load categories', e)
  } finally {
    categoriesLoading.value = false
  }
}

function startEditCategory(cat) {
  categoryEditingId.value = cat.id
  categoryForm.value = { name: cat.name, icon: cat.icon || '', parent_id: cat.parent_id || '' }
  categoryError.value = ''
  categorySuccess.value = ''
}

function cancelEditCategory() {
  categoryEditingId.value = null
  categoryForm.value = { name: '', icon: '', parent_id: '' }
  categoryError.value = ''
}

async function saveCategory() {
  if (!categoryForm.value.name.trim()) return
  categorySaving.value = true
  categoryError.value = ''
  categorySuccess.value = ''

  try {
    const data = { ...categoryForm.value }
    if (!data.parent_id) data.parent_id = null
    if (categoryEditingId.value) {
      const res = await categoriesAPI.update(categoryEditingId.value, data)
      const idx = categories.value.findIndex(c => c.id === categoryEditingId.value)
      if (idx !== -1) categories.value[idx] = res.data
      categorySuccess.value = 'Category updated successfully.'
    } else {
      const res = await categoriesAPI.create(data)
      categories.value.push(res.data)
      categorySuccess.value = 'Category created successfully.'
    }
    cancelEditCategory()
    setTimeout(() => { categorySuccess.value = '' }, 3000)
  } catch (e) {
    categoryError.value = e.response?.data?.message || e.response?.data?.errors?.name?.[0] || 'Failed to save category.'
  } finally {
    categorySaving.value = false
  }
}

async function deleteCategory(id) {
  try {
    await categoriesAPI.delete(id)
    categories.value = categories.value.filter(c => c.id !== id)
    categoryDeleteId.value = null
    categorySuccess.value = 'Category deleted successfully.'
    setTimeout(() => { categorySuccess.value = '' }, 3000)
  } catch (e) {
    categoryError.value = e.response?.data?.message || 'Failed to delete category.'
    setTimeout(() => { categoryError.value = '' }, 3000)
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-10">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-warm-900">Settings</h1>
      <p class="text-sm text-warm-500 mt-1">Manage your profile and account security</p>
    </div>

    <!-- Tab Nav -->
    <div class="flex flex-wrap gap-1 border-b border-warm-200 mb-8">
      <button
        v-for="tab in tabItems"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all -mb-px"
        :class="activeTab === tab.key
          ? 'text-brand-600 border-b-2 border-brand-500 bg-white/80'
          : 'text-warm-500 hover:text-warm-800 hover:bg-warm-50 border-b-2 border-transparent'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Profile & Password -->
    <div v-if="activeTab === 'profile'" class="space-y-8">
      <!-- Profile Section -->
      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-8">
        <h2 class="text-lg font-bold text-warm-900 mb-6">Profile Information</h2>

        <!-- Avatar -->
        <div class="flex items-center gap-5 mb-8">
          <div class="relative group">
            <div
              v-if="avatarPreview"
              class="w-20 h-20 rounded-2xl overflow-hidden border-2 border-warm-200 shadow-lg shadow-brand-500/10"
            >
              <img :src="avatarPreview" class="w-full h-full object-cover" alt="Avatar" />
            </div>
            <div
              v-else
              class="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-brand-500/25"
            >
              {{ user?.name?.charAt(0) }}
            </div>
            <label
              class="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
              <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
            </label>
          </div>
          <div>
            <p class="text-sm font-semibold text-warm-900">Profile Photo</p>
            <p class="text-xs text-warm-500 mt-0.5">JPG, PNG or WebP. Max 2MB.</p>
            <button
              v-if="avatarPreview"
              type="button"
              class="text-xs text-red-500 hover:text-red-600 mt-1 font-medium transition-colors"
              @click="removeAvatar"
            >
              Remove photo
            </button>
          </div>
        </div>

        <form @submit.prevent="saveProfile" class="space-y-5">
          <div class="grid grid-cols-2 gap-5">
            <div>
              <label for="name" class="block text-sm font-medium text-warm-700 mb-1.5">Full Name</label>
              <input
                id="name"
                v-model="profileForm.name"
                type="text"
                required
                class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-warm-700 mb-1.5">Email</label>
              <input
                id="email"
                v-model="profileForm.email"
                type="email"
                required
                class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-5">
            <div>
              <label for="phone" class="block text-sm font-medium text-warm-700 mb-1.5">Phone</label>
              <input
                id="phone"
                v-model="profileForm.phone"
                type="tel"
                class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
                placeholder="Your phone number"
              />
            </div>
            <div>
              <label for="address" class="block text-sm font-medium text-warm-700 mb-1.5">Address</label>
              <input
                id="address"
                v-model="profileForm.address"
                type="text"
                class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
                placeholder="Your address"
              />
            </div>
          </div>

          <div v-if="profileSuccess" class="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-200">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Profile updated successfully.
          </div>
          <div v-if="profileError" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-200">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {{ profileError }}
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="profileSaving"
              class="px-6 py-2.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="profileSaving" class="flex items-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Password Section -->
      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-8">
        <h2 class="text-lg font-bold text-warm-900 mb-1">Change Password</h2>
        <p class="text-sm text-warm-500 mb-6">Ensure your account stays secure with a strong password</p>

        <form @submit.prevent="savePassword" class="space-y-5">
          <div>
            <label for="current_password" class="block text-sm font-medium text-warm-700 mb-1.5">Current Password</label>
            <input
              id="current_password"
              v-model="passwordForm.current_password"
              type="password"
              required
              class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
              placeholder="Enter current password"
            />
          </div>

          <div class="grid grid-cols-2 gap-5">
            <div>
              <label for="new_password" class="block text-sm font-medium text-warm-700 mb-1.5">New Password</label>
              <input
                id="new_password"
                v-model="passwordForm.password"
                type="password"
                required
                minlength="6"
                class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label for="password_confirmation" class="block text-sm font-medium text-warm-700 mb-1.5">Confirm Password</label>
              <input
                id="password_confirmation"
                v-model="passwordForm.password_confirmation"
                type="password"
                required
                minlength="6"
                class="w-full rounded-xl border border-warm-200 bg-white/80 px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <div v-if="passwordSuccess" class="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-200">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Password updated successfully.
          </div>
          <div v-if="passwordError" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-200">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {{ passwordError }}
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="passwordSaving"
              class="px-6 py-2.5 bg-gradient-to-r from-warm-700 to-warm-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-warm-700/20 hover:shadow-lg hover:shadow-warm-700/25 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="passwordSaving" class="flex items-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating...
              </span>
              <span v-else>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tab: Notifications -->
    <NotificationsTab v-else-if="activeTab === 'notifications'" />

    <!-- Tab: Favorites -->
    <FavoritesTab v-else-if="activeTab === 'favorites'" />

    <!-- Tab: Saved Searches -->
    <SavedSearchesTab v-else-if="activeTab === 'savedSearches'" />

    <!-- Tab: Reviews -->
    <ReviewsTab v-else-if="activeTab === 'reviews'" />

    <!-- Tab: Rentals -->
    <RentalsTab v-else-if="activeTab === 'rentals'" />

    <!-- Tab: Categories -->
    <div v-else-if="activeTab === 'categories'" class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg shadow-warm-200/30 border border-warm-100 p-6 sm:p-8">
      <h2 class="text-lg font-bold text-warm-900 mb-1">Product Categories</h2>
      <p class="text-sm text-warm-500 mb-6">Manage the categories available for listings.</p>

      <div v-if="categorySuccess" class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 border border-emerald-200 mb-4">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {{ categorySuccess }}
      </div>
      <div v-if="categoryError" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-200 mb-4">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        {{ categoryError }}
      </div>

      <form @submit.prevent="saveCategory" class="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          v-model="categoryForm.name"
          type="text"
          placeholder="Category name"
          class="flex-1 px-4 py-2.5 rounded-xl border border-warm-200 bg-white/50 text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-400 transition-all text-sm"
          required
        />
        <select
          v-model="categoryForm.parent_id"
          class="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-warm-200 bg-white/50 text-warm-900 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-400 transition-all text-sm"
        >
          <option value="">— Top Level —</option>
          <option v-for="p in parentCategories" :key="p.id" :value="p.id" :disabled="p.id === categoryEditingId">{{ p.name }}</option>
        </select>
        <input
          v-model="categoryForm.icon"
          type="text"
          placeholder="Icon (optional)"
          class="w-full sm:w-24 px-4 py-2.5 rounded-xl border border-warm-200 bg-white/50 text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-500/30 focus:border-warm-400 transition-all text-sm"
        />
        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="categorySaving || !categoryForm.name.trim()"
            class="px-5 py-2.5 bg-gradient-to-r from-warm-700 to-warm-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-warm-700/20 hover:shadow-lg hover:shadow-warm-700/25 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <span v-if="categorySaving" class="flex items-center gap-2">
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </span>
            <span v-else>{{ categoryEditingId ? 'Update' : 'Add Category' }}</span>
          </button>
          <button
            v-if="categoryEditingId"
            type="button"
            @click="cancelEditCategory"
            class="px-4 py-2.5 text-warm-600 text-sm font-semibold rounded-xl border border-warm-200 hover:bg-warm-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>

      <div v-if="categoriesLoading" class="flex justify-center py-8">
        <svg class="animate-spin w-6 h-6 text-warm-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <div v-else-if="categories.length === 0" class="text-center py-8 text-warm-400 text-sm">
        No categories yet. Add one above.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center gap-3 p-3 rounded-xl border border-warm-100 bg-white/40 hover:bg-white/70 transition-all group"
        >
          <div class="flex-1 min-w-0">
            <div class="font-medium text-warm-900 text-sm truncate">
              <span v-if="cat.parent_id" class="text-warm-300 mr-1.5">↳</span>
              <span v-else class="text-warm-300 mr-1.5">●</span>
              {{ cat.name }}
            </div>
            <div class="text-xs text-warm-400">
              <span class="font-mono">{{ cat.slug }}</span>
              <span v-if="cat.parent" class="ml-1.5">in {{ cat.parent.name }}</span>
              <span v-if="cat.listings_count !== undefined" class="ml-1.5">· {{ cat.listings_count }} listing{{ cat.listings_count !== 1 ? 's' : '' }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              @click="startEditCategory(cat)"
              class="p-1.5 rounded-lg text-warm-400 hover:text-warm-700 hover:bg-warm-100 transition-all"
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </button>
            <button
              v-if="categoryDeleteId !== cat.id"
              @click="categoryDeleteId = cat.id"
              class="p-1.5 rounded-lg text-warm-400 hover:text-red-600 hover:bg-red-50 transition-all"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
            <div v-else class="flex items-center gap-1">
              <button
                @click="deleteCategory(cat.id)"
                class="px-2.5 py-1 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all"
              >
                Confirm
              </button>
              <button
                @click="categoryDeleteId = null"
                class="px-2.5 py-1 text-xs font-semibold text-warm-600 bg-warm-100 rounded-lg hover:bg-warm-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
