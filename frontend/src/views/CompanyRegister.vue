<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { companiesAPI } from '../services/api'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()

const form = ref({
  name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  website: '',
})

const errors = ref<Record<string, string>>({})
const loading = ref(false)

async function submit() {
  loading.value = true
  errors.value = {}
  try {
    const { data } = await companiesAPI.create(form.value)
    router.push(`/companies/${data.slug}`)
  } catch (err: any) {
    if (err.response?.status === 422) {
      const raw = err.response.data.errors
      errors.value = Object.fromEntries(Object.entries(raw).map(([k, v]: [string, any]) => [k, v[0]]))
    } else {
      toast.error('Something went wrong. Please try again.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-24 space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-warm-900">Register a Company</h1>
      <p class="text-warm-500 mt-2">Set up a company profile to manage your listings and team.</p>
    </div>

    <form @submit.prevent="submit" class="space-y-6 bg-white rounded-2xl p-8 border border-warm-200">
      <!-- Name -->
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

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1">Description</label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="Tell others what your company does..."
          class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm resize-none"
        />
      </div>

      <!-- Address -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1">Address</label>
        <input
          v-model="form.address"
          type="text"
          placeholder="123 Main St, Toronto, ON"
          class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
        />
      </div>

      <!-- Phone + Email row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Phone</label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="(416) 555-0123"
            class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-warm-700 mb-1">Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="info@company.com"
            class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
            :class="{ 'border-red-400': errors.email }"
          />
          <p v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</p>
        </div>
      </div>

      <!-- Website -->
      <div>
        <label class="block text-sm font-medium text-warm-700 mb-1">Website</label>
        <input
          v-model="form.website"
          type="url"
          placeholder="https://example.com"
          class="w-full px-4 py-2.5 rounded-xl border border-warm-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-sm"
          :class="{ 'border-red-400': errors.website }"
        />
        <p v-if="errors.website" class="text-red-500 text-xs mt-1">{{ errors.website }}</p>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="loading"
        class="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Creating...' : 'Create Company' }}
      </button>
    </form>
  </div>
</template>
