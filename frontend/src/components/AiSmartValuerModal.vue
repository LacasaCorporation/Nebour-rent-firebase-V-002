<script setup>
import { ref } from 'vue'
import api from '../services/api.js'
import { useToast } from '../composables/useToast'

const props = defineProps({
  isOpen: Boolean,
  initialTitle: { type: String, default: '' },
  initialCategory: { type: String, default: '' },
  imagePreview: { type: String, default: '' }
})

const emit = defineEmits(['close', 'apply'])
const toast = useToast()

const promptText = ref('')
const analyzing = ref(false)
const aiResult = ref(null)

async function runAiValuer() {
  analyzing.value = true
  aiResult.value = null
  try {
    const res = await api.post('/ai/smart-value', {
      title: props.initialTitle,
      category: props.initialCategory,
      prompt: promptText.value,
      imageBase64: props.imagePreview || null
    })
    aiResult.value = res.data
    toast.success('AI Valuation & Title Generation Complete!')
  } catch (e) {
    toast.error(e.response?.data?.error || 'AI valuation failed. Please try again.')
  } finally {
    analyzing.value = false
  }
}

function handleApply() {
  if (!aiResult.value) return
  emit('apply', {
    title: aiResult.value.title,
    description: aiResult.value.description,
    daily_rate: aiResult.value.suggestedDailyPrice,
    security_deposit: aiResult.value.suggestedSecurityDeposit,
    estimated_replacement: aiResult.value.estimatedReplacementValue
  })
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-warm-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
      
      <!-- Modal Header -->
      <div class="px-6 py-5 bg-gradient-to-r from-amber-500 via-brand-500 to-yellow-500 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold tracking-tight">AI Smart Valuer & Title Assistant</h3>
            <p class="text-xs text-amber-100 font-medium">Powered by Gemini AI • Smart pricing & listing optimization</p>
          </div>
        </div>
        <button @click="emit('close')" class="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-5 flex-1">
        
        <!-- Prompt & Input hints -->
        <div class="bg-amber-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-amber-200/60 dark:border-slate-700/60 space-y-3">
          <label class="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Item Notes or Specific Requirements (Optional)
          </label>
          <textarea
            v-model="promptText"
            rows="2"
            placeholder="e.g., DeWalt 20V hammer drill with 2 batteries and masonry bits in heavy duty case. Light usage."
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-warm-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
          ></textarea>
          
          <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span v-if="imagePreview" class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Photo attached for visual AI analysis
            </span>
            <span v-else>💡 Tip: Uploading an item photo gives more precise price valuations!</span>

            <button
              @click="runAiValuer"
              :disabled="analyzing"
              class="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-600 hover:to-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <svg v-if="analyzing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ analyzing ? 'Evaluating with Gemini...' : 'Analyze Item & Generate Valuation' }}</span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="analyzing" class="py-12 flex flex-col items-center justify-center space-y-3 text-center">
          <div class="relative w-12 h-12">
            <div class="absolute inset-0 rounded-full border-4 border-amber-200 dark:border-slate-700 animate-pulse"></div>
            <div class="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
          </div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">Evaluating market rates, title hooks, & security deposit recommendations...</p>
        </div>

        <!-- AI Generated Results Card -->
        <div v-else-if="aiResult" class="space-y-4 animate-fade-in">
          
          <!-- Key Metrics Grid -->
          <div class="grid grid-cols-3 gap-3">
            <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-center">
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Suggested Daily Rate</span>
              <p class="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">${{ aiResult.suggestedDailyPrice }}<span class="text-xs font-normal text-emerald-600 dark:text-emerald-400">/day</span></p>
            </div>
            
            <div class="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-center">
              <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Security Deposit</span>
              <p class="text-xl font-black text-amber-700 dark:text-amber-300 mt-1">${{ aiResult.suggestedSecurityDeposit }}</p>
            </div>

            <div class="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 rounded-2xl text-center">
              <span class="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Replacement Value</span>
              <p class="text-xl font-black text-sky-700 dark:text-sky-300 mt-1">${{ aiResult.estimatedReplacementValue }}</p>
            </div>
          </div>

          <!-- Title Suggestion -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Optimized Listing Title</span>
            <p class="text-base font-bold text-slate-900 dark:text-white">{{ aiResult.title }}</p>
          </div>

          <!-- Description Suggestion -->
          <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Generated Smart Description</span>
            <p class="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{{ aiResult.description }}</p>
          </div>

          <!-- Tags -->
          <div v-if="aiResult.tags?.length" class="flex flex-wrap items-center gap-1.5">
            <span class="text-xs font-bold text-slate-400 mr-1">Tags:</span>
            <span v-for="tag in aiResult.tags" :key="tag" class="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-full border border-amber-200/60 dark:border-amber-800/60">
              #{{ tag }}
            </span>
          </div>

          <!-- Tips -->
          <div v-if="aiResult.tips?.length" class="p-3.5 bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700 rounded-2xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <span class="font-bold flex items-center gap-1 text-blue-700 dark:text-blue-300">💡 Lender Tips & Recommendations:</span>
            <ul class="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
              <li v-for="tip in aiResult.tips" :key="tip">{{ tip }}</li>
            </ul>
          </div>

        </div>

      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Cancel
        </button>

        <button
          v-if="aiResult"
          @click="handleApply"
          class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Auto-Fill Listing Form
        </button>
      </div>

    </div>
  </div>
</template>
