<script setup>
import { ref, watch } from 'vue'
import api from '../services/api.js'
import { useToast } from '../composables/useToast'

const props = defineProps({
  isOpen: Boolean,
  rental: Object,
  stage: { type: String, default: 'pickup' } // 'pickup' | 'return'
})

const emit = defineEmits(['close', 'updated'])
const toast = useToast()

const selectedItems = ref([])
const handoverNotes = ref('')
const submitting = ref(false)

const checklistItems = [
  'Physical condition inspected for cracks, scratches or heavy wear',
  'Serial number & equipment model details verified',
  'All included accessories, manuals, batteries & cables present',
  'Power test / operation test completed & fully functional',
  'Safety & operation instructions reviewed together'
]

watch(() => props.isOpen, (open) => {
  if (open) {
    selectedItems.value = [...checklistItems] // pre-check items for convenient verification
    handoverNotes.value = props.stage === 'pickup' 
      ? 'Item received in excellent operational condition at pickup.'
      : 'Item returned in clean, undamaged condition with all accessories.'
  }
})

function toggleItem(item) {
  if (selectedItems.value.includes(item)) {
    selectedItems.value = selectedItems.value.filter(i => i !== item)
  } else {
    selectedItems.value.push(item)
  }
}

async function saveHandover() {
  if (!props.rental?.id) return
  submitting.value = true
  try {
    await api.post(`/rental-requests/${props.rental.id}/handover`, {
      stage: props.stage,
      items_checked: selectedItems.value,
      notes: handoverNotes.value
    })
    toast.success(`${props.stage === 'pickup' ? 'Pickup' : 'Return'} handover checklist completed!`)
    emit('updated')
    emit('close')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Failed to save handover verification')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-warm-200 dark:border-slate-800 overflow-hidden flex flex-col">
      
      <!-- Modal Header -->
      <div class="px-6 py-5 bg-gradient-to-r from-brand-600 to-emerald-600 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold tracking-tight">
              {{ stage === 'pickup' ? '📦 Pickup Handover Verification' : '🔄 Return Inspection Checklist' }}
            </h3>
            <p class="text-xs text-brand-100 font-medium">Verify item condition & prevent dispute claims</p>
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
        
        <!-- Item Banner -->
        <div class="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-3">
          <img
            :src="rental?.listing?.image_url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=120'"
            class="w-12 h-12 rounded-xl object-cover shrink-0"
          />
          <div class="min-w-0">
            <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">{{ rental?.listing?.title }}</h4>
            <p class="text-[11px] text-slate-500">Rental #{{ rental?.id }} • {{ stage === 'pickup' ? 'Initial Pickup' : 'Final Return' }}</p>
          </div>
        </div>

        <!-- Checklist Items -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Mandatory Condition Checkpoints
          </label>
          <div class="space-y-2">
            <div
              v-for="item in checklistItems"
              :key="item"
              @click="toggleItem(item)"
              :class="selectedItems.includes(item) ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'"
              class="p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all hover:border-emerald-400"
            >
              <div
                class="w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
                :class="selectedItems.includes(item) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'"
              >
                <svg v-if="selectedItems.includes(item)" class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">{{ item }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Inspection Notes / Condition Observations
          </label>
          <textarea
            v-model="handoverNotes"
            rows="2"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            placeholder="Add any additional notes regarding battery percentage, surface wear, or accessories..."
          ></textarea>
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
          @click="saveHandover"
          :disabled="submitting"
          class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{{ submitting ? 'Saving...' : 'Confirm Handover Verification' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>
