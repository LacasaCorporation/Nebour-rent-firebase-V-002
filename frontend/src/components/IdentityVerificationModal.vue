<script setup>
import { ref } from 'vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/auth.js'
import { useToast } from '../composables/useToast'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'verified'])
const authStore = useAuthStore()
const toast = useToast()

const docType = ref('drivers_license')
const badgeType = ref('trusted_lender')
const docIdNumber = ref('')
const phoneNumber = ref(authStore.currentUser?.phone || '555-0199')
const docFile = ref(null)
const docPreview = ref('')
const submitting = ref(false)

function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (file) {
    docFile.value = file
    const reader = new FileReader()
    reader.onload = (ev) => { docPreview.value = ev.target.result }
    reader.readAsDataURL(file)
  }
}

async function submitVerification() {
  submitting.value = true
  try {
    const res = await api.post('/user/verify-identity', {
      document_type: docType.value,
      badge_type: badgeType.value,
      doc_number: docIdNumber.value,
      phone: phoneNumber.value
    })
    
    // Refresh auth store user data
    await authStore.fetchUser()
    toast.success('Identity & ID Verification completed successfully! Badges unlocked.')
    emit('verified')
    emit('close')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Verification failed. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-warm-200 dark:border-slate-800 overflow-hidden flex flex-col">
      
      <!-- Modal Header -->
      <div class="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold tracking-tight">ID & Identity Verification Badging</h3>
            <p class="text-xs text-teal-100 font-medium">Earn Verified Renter & Trusted Lender Badges</p>
          </div>
        </div>
        <button @click="emit('close')" class="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        
        <!-- Badge Type Selection -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Desired Profile Badge Type
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="badgeType = 'trusted_lender'"
              :class="badgeType === 'trusted_lender' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'"
              class="p-3 rounded-2xl border text-left transition-all"
            >
              <div class="text-xs font-bold text-emerald-700 dark:text-emerald-300">🛡️ Trusted Lender</div>
              <p class="text-[10px] text-slate-500 mt-0.5">High trust rating for listing items</p>
            </button>

            <button
              type="button"
              @click="badgeType = 'verified_renter'"
              :class="badgeType === 'verified_renter' ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'"
              class="p-3 rounded-2xl border text-left transition-all"
            >
              <div class="text-xs font-bold text-sky-700 dark:text-sky-300">✓ Verified Renter</div>
              <p class="text-[10px] text-slate-500 mt-0.5">Instant booking authorization</p>
            </button>
          </div>
        </div>

        <!-- Document Type -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Verification Document Type
          </label>
          <select
            v-model="docType"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none"
          >
            <option value="drivers_license">Driver's License / State ID</option>
            <option value="passport">Passport</option>
            <option value="national_id">National Identification Card</option>
          </select>
        </div>

        <!-- Phone Number -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Phone Verification Number
          </label>
          <input
            v-model="phoneNumber"
            type="text"
            placeholder="e.g., +1 (555) 019-2831"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium outline-none"
          />
        </div>

        <!-- Document Upload Preview -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Upload Document Photo / Scan
          </label>
          <div
            class="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center bg-slate-50/50 dark:bg-slate-800/50 hover:border-emerald-400 transition-colors cursor-pointer relative"
          >
            <input
              type="file"
              accept="image/*"
              @change="handleFileUpload"
              class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div v-if="docPreview" class="space-y-2">
              <img :src="docPreview" class="h-28 mx-auto rounded-xl object-contain border border-slate-200" />
              <p class="text-[11px] font-bold text-emerald-600">✓ Document uploaded ready for analysis</p>
            </div>
            <div v-else class="space-y-1">
              <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                📸
              </div>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-300">Click to upload photo of ID or license</p>
              <p class="text-[10px] text-slate-400">Supported formats: JPG, PNG (Max 10MB)</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          Cancel
        </button>

        <button
          @click="submitVerification"
          :disabled="submitting"
          class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{{ submitting ? 'Verifying...' : 'Submit & Unlock Badges' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>
