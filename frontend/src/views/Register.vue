<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const loading = ref(false)
const error = ref('')
const errors = ref({})

if (authStore.isAuthenticated.value) router.push('/')

async function handleRegister() {
  error.value = ''
  errors.value = {}
  loading.value = true
  try {
    await authStore.register(form.value)
    router.push('/')
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = e.response.data.errors || {}
    } else {
      error.value = e.response?.data?.message || 'Registration failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center">
    <!-- Left: Visual -->
    <div class="hidden lg:flex w-1/2 min-h-[80vh] bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 relative overflow-hidden rounded-l-[2rem]">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-1/3 right-1/4 w-56 h-56 bg-white/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/3 left-1/4 w-72 h-72 bg-white/15 rounded-full blur-3xl"></div>
      </div>
      <div class="relative z-10 flex flex-col justify-center px-12">
        <h2 class="text-3xl font-bold text-white mb-4">Join the Community</h2>
        <p class="text-white/70 leading-relaxed">Create your account, list items from your home, and start renting from your trusted neighbors today.</p>
      </div>
    </div>

    <!-- Right: Form -->
    <div class="w-full max-w-md lg:w-1/2">
      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-warm-200 p-8 shadow-xl shadow-black/5">
        <div class="text-center mb-8">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-brand-500/30">
            N
          </div>
          <h1 class="text-2xl font-bold text-warm-900">Create Account</h1>
          <p class="text-sm text-warm-500 mt-1">Start renting from your neighbors</p>
        </div>

        <div v-if="error" class="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {{ error }}
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Full Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Your full name"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-800 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <p v-if="errors.name" class="text-xs text-red-500 mt-1">{{ errors.name[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              placeholder="you@example.com"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-800 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Password</label>
            <input
              v-model="form.password"
              type="password"
              required
              placeholder="Create a password"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-800 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <p v-if="errors.password" class="text-xs text-red-500 mt-1">{{ errors.password[0] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Confirm Password</label>
            <input
              v-model="form.password_confirmation"
              type="password"
              required
              placeholder="Confirm your password"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-800 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:shadow-xl hover:shadow-brand-500/25 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Creating Account...' : 'Create Account' }}
          </button>
        </form>

        <p class="text-center text-sm text-warm-500 mt-6">
          Already have an account?
          <RouterLink to="/login" class="font-semibold text-brand-500 hover:text-brand-600 transition-colors">
            Sign in
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
