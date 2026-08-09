<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { jackpotAPI, listingsAPI } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { listingImageUrl } from '../utils/imageUrl'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()
const toast = useToast()

const currentWinner = ref<any>(null)
const candidates = ref<any[]>([])
const history = ref<any[]>([])
const myListings = ref<any[]>([])
const loading = ref(true)

// Admin controls & draw state
const isAdmin = computed(() => authStore.currentUser.value?.is_admin === 1 || authStore.currentUser.value?.is_admin === true || authStore.currentUser.value?.email === 'admin@mail.com')
const weekLabel = ref(`Week ${Math.ceil(new Date().getDate() / 7)} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`)
const prizeDescription = ref('🌟 #1 Top App Banner Feature + 0% Service Fee for 30 Days + $50 Rental Credit')

// Roulette Scroll Animation State
const isSpinning = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)
const highlightedIndex = ref<number | null>(null)
const selectedWinnerCandidate = ref<any>(null)
const showWinnerModal = ref(false)
const manualCandidateId = ref<number | string>('')

// User Entry State
const selectedUserListingId = ref<number | string>('')
const enteringDraw = ref(false)

// Countdown timer
const countdown = ref({ days: 3, hours: 14, minutes: 22, seconds: 45 })

function startCountdown() {
  setInterval(() => {
    if (countdown.value.seconds > 0) {
      countdown.value.seconds--
    } else {
      countdown.value.seconds = 59
      if (countdown.value.minutes > 0) {
        countdown.value.minutes--
      } else {
        countdown.value.minutes = 59
        if (countdown.value.hours > 0) {
          countdown.value.hours--
        } else {
          countdown.value.hours = 23
          if (countdown.value.days > 0) {
            countdown.value.days--
          }
        }
      }
    }
  }, 1000)
}

// Web Audio API tick sounds
function playTickSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.05)
  } catch {}
}

function playVictoryFanfare() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + idx * 0.1)
      osc.stop(ctx.currentTime + idx * 0.1 + 0.3)
    })
  } catch {}
}

async function loadData() {
  try {
    loading.value = true
    const [currentRes, candidatesRes, historyRes] = await Promise.all([
      jackpotAPI.getCurrent(),
      jackpotAPI.getCandidates(),
      jackpotAPI.getHistory()
    ])

    currentWinner.value = currentRes.data?.winner || null
    candidates.value = candidatesRes.data?.candidates || []
    history.value = historyRes.data?.data || []

    if (authStore.isAuthenticated.value) {
      try {
        const myListingsRes = await listingsAPI.getMyListings()
        myListings.value = myListingsRes.data?.listings || myListingsRes.data?.data || myListingsRes.data || []
        if (myListings.value.length > 0) {
          selectedUserListingId.value = myListings.value[0].id
        }
      } catch {}
    }
  } catch (err: any) {
    toast.error('Failed to load jackpot details.')
  } finally {
    loading.value = false
  }
}

// Perform Admin Weekly Wheel Scroll Draw
async function runJackpotScrollDraw() {
  if (candidates.value.length === 0) {
    toast.error('No candidate listings available to draw from.')
    return
  }

  isSpinning.value = true
  highlightedIndex.value = 0
  selectedWinnerCandidate.value = null

  // Determine winner index
  let targetIndex: number
  if (manualCandidateId.value) {
    targetIndex = candidates.value.findIndex(c => String(c.id) === String(manualCandidateId.value))
    if (targetIndex === -1) targetIndex = Math.floor(Math.random() * candidates.value.length)
  } else {
    targetIndex = Math.floor(Math.random() * candidates.value.length)
  }

  const chosenCandidate = candidates.value[targetIndex]

  // Animate scroll steps
  const totalRounds = 3
  const totalSteps = totalRounds * candidates.value.length + targetIndex
  let currentStep = 0

  function stepAnimation() {
    highlightedIndex.value = currentStep % candidates.value.length
    playTickSound()

    // Scroll container smoothly
    if (scrollContainer.value) {
      const itemWidth = 240
      scrollContainer.value.scrollTo({
        left: highlightedIndex.value * itemWidth - 100,
        behavior: 'smooth'
      })
    }

    currentStep++

    if (currentStep <= totalSteps) {
      // Calculate slowing down delay
      const progress = currentStep / totalSteps
      const delay = 60 + Math.pow(progress, 3) * 350
      setTimeout(stepAnimation, delay)
    } else {
      // Finished scroll draw!
      isSpinning.value = false
      selectedWinnerCandidate.value = chosenCandidate
      playVictoryFanfare()
      showWinnerModal.value = true
    }
  }

  stepAnimation()
}

// Confirm & Save Winner
async function confirmWinner() {
  if (!selectedWinnerCandidate.value) return
  try {
    const res = await jackpotAPI.runDraw(
      selectedWinnerCandidate.value.id,
      weekLabel.value,
      prizeDescription.value
    )
    toast.success(`🎉 ${selectedWinnerCandidate.value.title} crowned as Weekly Jackpot Winner!`)
    showWinnerModal.value = false
    await loadData()
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to crown winner.')
  }
}

// User submit listing into weekly draw
async function handleUserEnterDraw() {
  if (!selectedUserListingId.value) {
    toast.error('Please select one of your listings to enter.')
    return
  }
  try {
    enteringDraw.value = true
    await jackpotAPI.enter(selectedUserListingId.value, weekLabel.value)
    toast.success('✨ Listing entered into the Weekly Jackpot Draw successfully!')
    await loadData()
  } catch (err: any) {
    toast.error(err.response?.data?.error || 'Failed to enter draw.')
  } finally {
    enteringDraw.value = false
  }
}

// Admin set historical winner as active
async function makeActive(id: number) {
  try {
    await jackpotAPI.setActive(id)
    toast.success('Active jackpot winner updated!')
    await loadData()
  } catch (err: any) {
    toast.error('Failed to set active winner.')
  }
}

// Admin delete history record
async function deleteDraw(id: number) {
  if (!confirm('Are you sure you want to delete this jackpot draw entry?')) return
  try {
    await jackpotAPI.delete(id)
    toast.success('Draw record deleted.')
    await loadData()
  } catch (err: any) {
    toast.error('Failed to delete draw.')
  }
}

onMounted(() => {
  loadData()
  startCountdown()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
    
    <!-- Hero Header -->
    <div class="relative rounded-3xl bg-gradient-to-br from-slate-950 via-warm-900 to-amber-950 text-white p-8 sm:p-12 border-2 border-amber-500/40 shadow-2xl overflow-hidden">
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div class="space-y-4 max-w-2xl">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg">
            <span>🎰</span> Weekly Spotlight Draw
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Neighborhood Weekly <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">Jackpot</span>
          </h1>
          <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
            Every week, the admin spins the Jackpot Wheel to feature a lucky user's listing at the <strong>very top of the entire app</strong> for 7 full days, with 0% platform service fees!
          </p>
        </div>

        <!-- Live Countdown Clock -->
        <div class="bg-white/10 backdrop-blur-md border border-amber-400/30 rounded-3xl p-6 text-center space-y-3 min-w-[280px] shadow-xl">
          <div class="text-xs font-bold uppercase tracking-widest text-amber-300 flex items-center justify-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Next Draw Countdown
          </div>
          <div class="grid grid-cols-4 gap-2 font-mono">
            <div class="bg-slate-900/80 p-2.5 rounded-2xl border border-amber-400/20">
              <div class="text-xl sm:text-2xl font-black text-amber-300">{{ countdown.days }}</div>
              <div class="text-[10px] text-slate-400 uppercase font-sans">Days</div>
            </div>
            <div class="bg-slate-900/80 p-2.5 rounded-2xl border border-amber-400/20">
              <div class="text-xl sm:text-2xl font-black text-amber-300">{{ countdown.hours }}</div>
              <div class="text-[10px] text-slate-400 uppercase font-sans">Hours</div>
            </div>
            <div class="bg-slate-900/80 p-2.5 rounded-2xl border border-amber-400/20">
              <div class="text-xl sm:text-2xl font-black text-amber-300">{{ countdown.minutes }}</div>
              <div class="text-[10px] text-slate-400 uppercase font-sans">Mins</div>
            </div>
            <div class="bg-slate-900/80 p-2.5 rounded-2xl border border-amber-400/20">
              <div class="text-xl sm:text-2xl font-black text-amber-300">{{ countdown.seconds }}</div>
              <div class="text-[10px] text-slate-400 uppercase font-sans">Secs</div>
            </div>
          </div>
          <p class="text-[11px] text-amber-200/80">Admin spins weekly to crown the next winner!</p>
        </div>
      </div>
    </div>

    <!-- Current Weekly Jackpot Winner Section -->
    <div v-if="currentWinner" class="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 rounded-3xl p-1 border-2 border-amber-400/40 shadow-xl">
      <div class="bg-white rounded-[22px] p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-amber-500/30">
              👑
            </div>
            <div>
              <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Current Active Spotlight</span>
              <h2 class="text-2xl font-bold text-slate-900">Featured Jackpot Winner</h2>
            </div>
          </div>
          <span class="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-full border border-amber-300">
            {{ currentWinner.week_label || 'Current Week' }}
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <!-- Image -->
          <div class="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 shadow-md group">
            <img
              :src="listingImageUrl(currentWinner.winner_image_url)"
              :alt="currentWinner.winner_product_title"
              class="w-full h-72 object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div class="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow">
              #1 SPOTLIGHTED APP TOP
            </div>
          </div>

          <!-- Details -->
          <div class="lg:col-span-7 space-y-5">
            <div>
              <h3 class="text-2xl font-black text-slate-900 mb-2">
                {{ currentWinner.winner_product_title }}
              </h3>
              <p class="text-sm text-slate-600 leading-relaxed">
                {{ currentWinner.prize_description || 'Featured Spotlight Listing at the top of Neighborhood Rental!' }}
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="text-[11px] text-slate-400 uppercase font-semibold block">Winner Owner</span>
                <span class="text-xs font-bold text-slate-800">{{ currentWinner.winner_user_name }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span class="text-[11px] text-slate-400 uppercase font-semibold block">Daily Rate</span>
                <span class="text-xs font-bold text-emerald-600">${{ currentWinner.daily_rate || '--' }}/day</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span class="text-[11px] text-slate-400 uppercase font-semibold block">Location</span>
                <span class="text-xs font-bold text-slate-800 truncate block">{{ currentWinner.location || 'Local' }}</span>
              </div>
            </div>

            <div class="pt-2 flex flex-wrap gap-3">
              <RouterLink
                v-if="currentWinner.winner_listing_id"
                :to="`/listings/${currentWinner.winner_listing_id}`"
                class="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
              >
                <span>⚡</span> Book & Rent Winner Listing Now
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Weekly Jackpot Wheel / Scroll Engine (Admin & Community View) -->
    <div class="bg-slate-950 text-white rounded-3xl p-6 sm:p-10 border-2 border-amber-500/30 shadow-2xl relative overflow-hidden space-y-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span class="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">🎰 Live Weekly Jackpot Reel</span>
          <h2 class="text-2xl sm:text-3xl font-black text-white">The Jackpot Scroll Wheel</h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Watch the live scroll of candidate products. Admin clicks below to run the official weekly draw!
          </p>
        </div>

        <!-- Admin Spin Trigger -->
        <div v-if="isAdmin" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            @click="runJackpotScrollDraw"
            :disabled="isSpinning || candidates.length === 0"
            type="button"
            class="px-6 py-3.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span v-if="!isSpinning" class="text-lg">🎰</span>
            <svg v-else class="w-5 h-5 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>{{ isSpinning ? 'SPINNING & DRAWING...' : 'RUN WEEKLY JACKPOT DRAW' }}</span>
          </button>
        </div>

        <div v-else class="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl">
          🔑 Log in as Admin (e.g. <code class="bg-slate-900 px-1 py-0.5 rounded font-mono">alice@example.com</code>) to spin the wheel!
        </div>
      </div>

      <!-- Admin Parameters Form -->
      <div v-if="isAdmin" class="bg-white/5 border border-white/10 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-300 mb-1">Week Label</label>
          <input
            v-model="weekLabel"
            type="text"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label class="block font-semibold text-slate-300 mb-1">Prize & Feature Description</label>
          <input
            v-model="prizeDescription"
            type="text"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label class="block font-semibold text-slate-300 mb-1">Target Winner (Optional Override)</label>
          <select
            v-model="manualCandidateId"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-none"
          >
            <option value="">🎲 Random Pick Algorithm</option>
            <option v-for="c in candidates" :key="c.id" :value="c.id">
              {{ c.title }} (by {{ c.user?.name || c.user_name }})
            </option>
          </select>
        </div>
      </div>

      <!-- Scroll Wheel Reel Display -->
      <div class="relative py-4">
        <!-- Center Pointer Line -->
        <div class="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-500 z-20 shadow-lg pointer-events-none -translate-x-1/2">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👇</div>
          <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 text-lg">👆</div>
        </div>

        <div
          ref="scrollContainer"
          class="flex items-center gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-amber-500/50 scrollbar-track-slate-900 px-8 transition-all"
        >
          <div
            v-for="(candidate, index) in candidates"
            :key="candidate.id"
            :class="[
              'flex-shrink-0 w-56 p-3 rounded-2xl border transition-all duration-200 relative',
              highlightedIndex === index
                ? 'bg-gradient-to-b from-amber-500/30 to-amber-900/60 border-amber-400 scale-105 shadow-2xl shadow-amber-400/30 ring-2 ring-amber-400'
                : 'bg-slate-900/80 border-slate-800 opacity-70 hover:opacity-100'
            ]"
          >
            <div class="relative h-32 rounded-xl overflow-hidden mb-2">
              <img
                :src="listingImageUrl(candidate.image_url)"
                :alt="candidate.title"
                class="w-full h-full object-cover"
              />
              <span class="absolute bottom-1 left-1 bg-black/70 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                ${{ candidate.daily_rate }}/day
              </span>
            </div>
            <h4 class="text-xs font-bold text-white truncate">{{ candidate.title }}</h4>
            <p class="text-[10px] text-slate-400 truncate">Owner: {{ candidate.user?.name || candidate.user_name || 'Neighbor' }}</p>

            <span v-if="highlightedIndex === index" class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
              SELECTED
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit My Listing for Draw Section -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-xl space-y-6">
      <div class="flex items-center justify-between border-b border-warm-100 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-lg">
            🚀
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Enter Your Product into Weekly Jackpot</h3>
            <p class="text-xs text-slate-500">Submit your listing for a chance to win the top app banner spotlight!</p>
          </div>
        </div>
      </div>

      <div v-if="!authStore.isAuthenticated.value" class="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center justify-between">
        <span>Please sign in to enter your listings into the weekly jackpot draw.</span>
        <RouterLink to="/login" class="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs">
          Sign In Now
        </RouterLink>
      </div>

      <div v-else-if="myListings.length === 0" class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center justify-between">
        <span>You don't have any active listings yet. Create a listing first!</span>
        <RouterLink to="/create-listing" class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs">
          + Create Listing
        </RouterLink>
      </div>

      <div v-else class="flex flex-col sm:flex-row items-center gap-4">
        <select
          v-model="selectedUserListingId"
          class="w-full sm:w-auto flex-1 px-4 py-3 rounded-xl border border-warm-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:border-brand-500"
        >
          <option v-for="item in myListings" :key="item.id" :value="item.id">
            {{ item.title }} (${{ item.daily_rate }}/day)
          </option>
        </select>

        <button
          @click="handleUserEnterDraw"
          :disabled="enteringDraw"
          type="button"
          class="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span>✨</span> {{ enteringDraw ? 'Submitting...' : 'Submit to Weekly Draw' }}
        </button>
      </div>
    </div>

    <!-- Past Winners Hall of Fame -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-xl space-y-6">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
            🏆
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-900">Hall of Fame - Past Weekly Winners</h3>
            <p class="text-xs text-slate-500">Archival history of weekly spotlight crowns</p>
          </div>
        </div>
      </div>

      <div v-if="history.length === 0" class="text-center py-8 text-xs text-slate-400">
        No past draw history recorded yet.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in history"
          :key="item.id"
          :class="[
            'p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4',
            item.is_active ? 'bg-amber-50/50 border-amber-300 shadow-md' : 'bg-slate-50 border-slate-200'
          ]"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {{ item.week_label }}
              </span>
              <h4 class="text-sm font-bold text-slate-900 mt-2">{{ item.winner_product_title }}</h4>
              <p class="text-xs text-slate-500">Winner: {{ item.winner_user_name }}</p>
            </div>
            <span v-if="item.is_active" class="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full">
              ACTIVE
            </span>
          </div>

          <div class="flex items-center justify-between border-t border-slate-200/60 pt-3">
            <span class="text-[11px] text-slate-400 font-mono">
              {{ new Date(item.draw_date).toLocaleDateString() }}
            </span>

            <div v-if="isAdmin" class="flex items-center gap-2">
              <button
                v-if="!item.is_active"
                @click="makeActive(item.id)"
                class="text-[11px] font-bold text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                Set Active
              </button>
              <button
                @click="deleteDraw(item.id)"
                class="text-[11px] font-bold text-red-500 hover:text-red-700 p-1"
                title="Delete Record"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Winner Crown Modal Confirmation -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showWinnerModal && selectedWinnerCandidate" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-gradient-to-b from-slate-900 to-amber-950 text-white rounded-3xl w-full max-w-md p-6 space-y-6 text-center border-2 border-amber-400 shadow-2xl relative">
            <div class="w-20 h-20 rounded-3xl bg-amber-400 text-slate-950 text-4xl flex items-center justify-center mx-auto shadow-2xl shadow-amber-400/50 animate-bounce">
              👑
            </div>

            <div>
              <span class="text-xs font-bold uppercase tracking-widest text-amber-300">WE HAVE A WINNER!</span>
              <h3 class="text-2xl font-black text-amber-100 mt-1">{{ selectedWinnerCandidate.title }}</h3>
              <p class="text-xs text-amber-200/80 mt-1">Owned by {{ selectedWinnerCandidate.user?.name || selectedWinnerCandidate.user_name || 'Neighbor' }}</p>
            </div>

            <div class="p-4 bg-white/10 rounded-2xl border border-white/20 text-xs text-left space-y-2">
              <div class="text-amber-300 font-bold uppercase text-[10px]">Draw Summary</div>
              <div><strong>Week:</strong> {{ weekLabel }}</div>
              <div><strong>Prize:</strong> {{ prizeDescription }}</div>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button
                @click="showWinnerModal = false"
                type="button"
                class="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
              >
                Cancel / Re-spin
              </button>
              <button
                @click="confirmWinner"
                type="button"
                class="flex-1 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-400/30"
              >
                Crown & Save Winner!
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
