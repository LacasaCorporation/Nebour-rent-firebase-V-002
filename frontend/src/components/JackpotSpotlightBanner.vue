<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { jackpotAPI } from '../services/api'
import { listingImageUrl } from '../utils/imageUrl'

const currentWinner = ref<any>(null)
const loading = ref(true)

async function loadCurrentWinner() {
  try {
    const res = await jackpotAPI.getCurrent()
    currentWinner.value = res.data?.winner || null
  } catch (err) {
    console.error('Failed to load jackpot spotlight banner:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCurrentWinner()
})
</script>

<template>
  <div v-if="!loading && currentWinner" class="w-full mb-8">
    <div class="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950 via-warm-900 to-amber-900 border-2 border-amber-500/40 shadow-2xl shadow-amber-900/20 text-white p-5 sm:p-7">
      <!-- Glow FX -->
      <div class="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -left-16 w-64 h-64 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        <!-- Left Column: Badge, Title & Description -->
        <div class="space-y-3 max-w-2xl">
          <div class="flex items-center flex-wrap gap-2">
            <span class="px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
              <span>👑</span> Weekly Jackpot Winner
            </span>
            <span class="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-200 text-xs font-medium border border-white/10">
              {{ currentWinner.week_label || 'Current Week' }}
            </span>
          </div>

          <h3 class="text-xl sm:text-2xl font-black text-amber-100 tracking-tight leading-snug">
            {{ currentWinner.winner_product_title }}
          </h3>

          <p class="text-xs sm:text-sm text-amber-100/80 leading-relaxed line-clamp-2">
            {{ currentWinner.prize_description || 'Featured Spotlight Listing at the top of Neighborhood Rental!' }}
          </p>

          <!-- User / Owner info -->
          <div class="flex items-center gap-3 pt-1">
            <img
              :src="currentWinner.winner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'"
              :alt="currentWinner.winner_user_name"
              class="w-8 h-8 rounded-full border-2 border-amber-400 object-cover shadow-sm"
            />
            <div class="text-xs">
              <div class="text-amber-200/70 text-[10px] font-semibold uppercase tracking-wider">Spotlight Owner</div>
              <div class="font-bold text-white">{{ currentWinner.winner_user_name }}</div>
            </div>
            <div v-if="currentWinner.daily_rate" class="ml-auto sm:ml-4 text-xs bg-amber-400/20 border border-amber-400/30 px-3 py-1 rounded-xl text-amber-200 font-bold">
              ${{ currentWinner.daily_rate }}/day
            </div>
          </div>
        </div>

        <!-- Right Column: Winner Preview Image & Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center gap-4 border-t lg:border-t-0 lg:border-l border-amber-500/20 pt-4 lg:pt-0 lg:pl-6">
          <div v-if="currentWinner.winner_image_url" class="relative w-full sm:w-36 h-28 rounded-2xl overflow-hidden border border-amber-400/40 shadow-lg flex-shrink-0 group">
            <img
              :src="listingImageUrl(currentWinner.winner_image_url)"
              :alt="currentWinner.winner_product_title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <span class="absolute bottom-1.5 left-2 text-[10px] bg-amber-500/90 text-slate-950 font-bold px-1.5 py-0.5 rounded">
              TOP SPOT
            </span>
          </div>

          <div class="flex flex-col gap-2 w-full sm:w-auto">
            <RouterLink
              v-if="currentWinner.winner_listing_id"
              :to="`/listings/${currentWinner.winner_listing_id}`"
              class="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-amber-500/30 transition-all text-center flex items-center justify-center gap-2"
            >
              <span>⚡</span> Rent Winning Item
            </RouterLink>

            <RouterLink
              to="/jackpot"
              class="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>🎰</span> View Weekly Jackpot
            </RouterLink>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
