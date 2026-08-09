<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

if (authStore.isAuthenticated.value) router.push('/')

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.message || 'Invalid credentials. Please try again.'
  } finally {
    loading.value = false
  }
}

async function loginAsDemo(demoEmail, demoPassword = 'password') {
  email.value = demoEmail
  password.value = demoPassword
  await handleLogin()
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center py-6 px-4">
    <div class="w-full max-w-4xl bg-white/80 backdrop-blur-md rounded-3xl border border-warm-200/80 shadow-2xl shadow-warm-900/5 overflow-hidden flex flex-col lg:flex-row">
      
      <!-- Left: Visual & Quick Demo Info -->
      <div class="w-full lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-600 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
        <div class="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-12 -right-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"></div>

        <div class="relative z-10">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-semibold backdrop-blur-md mb-6 border border-white/20">
            <span>✨</span> Peer-to-Peer Rental Network
          </div>
          <h2 class="text-3xl font-bold text-white mb-3 tracking-tight">Welcome Back</h2>
          <p class="text-white/80 text-sm leading-relaxed mb-6">
            Sign in to access your neighbor network, manage your rentals, and explore local tools and equipment.
          </p>
        </div>

        <!-- Demo Accounts Box -->
        <div class="relative z-10 bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-5 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-200">🚀 Quick Demo Accounts</span>
            <span class="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">Password: password</span>
          </div>

          <!-- Main Admin Account Button -->
          <button
            @click="loginAsDemo('admin@mail.com')"
            type="button"
            class="w-full text-left p-3 rounded-xl bg-gradient-to-r from-amber-500/30 to-yellow-500/30 hover:bg-amber-500/40 border border-amber-300/50 transition-all flex items-center justify-between group shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm border border-amber-300 shadow">
                🔑
              </div>
              <div>
                <div class="text-sm font-bold text-amber-100 group-hover:translate-x-0.5 transition-transform flex items-center gap-1.5">
                  System Admin
                  <span class="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">ADMIN</span>
                </div>
                <div class="text-xs text-amber-200/90 font-mono">admin@mail.com</div>
              </div>
            </div>
            <span class="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg hover:bg-amber-300 transition-colors">
              Admin Login
            </span>
          </button>

          <!-- Main Demo User Button -->
          <button
            @click="loginAsDemo('demo@example.com')"
            type="button"
            class="w-full text-left p-3 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 transition-all flex items-center justify-between group shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-400/40 text-white flex items-center justify-center font-bold text-sm border border-white/40">
                👤
              </div>
              <div>
                <div class="text-sm font-semibold text-white group-hover:translate-x-0.5 transition-transform">
                  Demo User
                </div>
                <div class="text-xs text-white/75 font-mono">demo@example.com</div>
              </div>
            </div>
            <span class="text-xs bg-white text-brand-700 font-bold px-2.5 py-1 rounded-lg group-hover:bg-emerald-100 transition-colors">
              1-Click Sign In
            </span>
          </button>

          <!-- Secondary Demo Users -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button
              @click="loginAsDemo('alice@example.com')"
              type="button"
              class="text-left p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-xs"
            >
              <div class="font-semibold text-white">Alice (Admin)</div>
              <div class="text-[11px] text-white/70 font-mono truncate">alice@example.com</div>
            </button>
            <button
              @click="loginAsDemo('bob@example.com')"
              type="button"
              class="text-left p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition-all text-xs"
            >
              <div class="font-semibold text-white">Bob (Lender)</div>
              <div class="text-[11px] text-white/70 font-mono truncate">bob@example.com</div>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Form -->
      <div class="w-full lg:w-1/2 p-8 lg:p-10 flex flex-col justify-center bg-white">
        <div class="text-center lg:text-left mb-6">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-lg mb-3 shadow-md shadow-brand-500/20 lg:mx-0 mx-auto">
            N
          </div>
          <h1 class="text-2xl font-bold text-warm-900">Sign In</h1>
          <p class="text-sm text-warm-500 mt-1">Enter your credentials or click a demo account on the left</p>
        </div>

        <div v-if="error" class="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {{ error }}
        </div>

        <!-- Credentials Hint Banner for Mobile -->
        <div class="lg:hidden mb-5 p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800 space-y-1">
          <div class="font-bold flex items-center gap-1">
            <span>💡 Demo Login Available</span>
          </div>
          <div><strong>Email:</strong> <code class="bg-white px-1.5 py-0.5 rounded border border-brand-200">demo@example.com</code></div>
          <div><strong>Password:</strong> <code class="bg-white px-1.5 py-0.5 rounded border border-brand-200">password</code></div>
          <button
            @click="loginAsDemo('demo@example.com')"
            type="button"
            class="w-full mt-2 py-1.5 bg-brand-600 text-white font-semibold rounded-lg text-xs"
          >
            Sign In with Demo User
          </button>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Email Address</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="demo@example.com"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50/50 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-warm-800 mb-1.5">Password</label>
            <input
              v-model="password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50/50 text-sm text-warm-900 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {{ loading ? 'Signing In...' : 'Sign In to Account' }}
          </button>
        </form>

        <div class="mt-6 pt-6 border-t border-warm-100 flex items-center justify-between text-xs text-warm-500">
          <span>Don't have an account?</span>
          <RouterLink to="/register" class="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            Create an Account →
          </RouterLink>
        </div>
      </div>

    </div>
  </div>
</template>
