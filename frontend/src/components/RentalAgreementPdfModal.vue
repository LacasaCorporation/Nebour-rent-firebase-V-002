<script setup>
import { computed } from 'vue'
import IdentityBadge from './IdentityBadge.vue'

const props = defineProps({
  isOpen: Boolean,
  rental: Object // { id, listing, start_date, end_date, total_days, total_price, security_deposit, insurance_plan, insurance_fee, renter, owner, created_at, handover_notes }
})

const emit = defineEmits(['close'])

const formattedDate = (dStr) => {
  if (!dStr) return 'N/A'
  return new Date(dStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const contractNumber = computed(() => {
  return `AGR-${String(props.rental?.id || 1001).padStart(6, '0')}`
})

const insurancePlanLabel = computed(() => {
  const plan = props.rental?.insurance_plan || 'peace_of_mind'
  if (plan === 'all_risk') return 'Zero Liability ($10/day All-Risk Cover)'
  if (plan === 'peace_of_mind') return 'Peace of Mind ($5/day Damage Waiver)'
  return 'Standard Security Deposit Hold'
})

function triggerPrint() {
  window.print()
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
    <div class="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-warm-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
      
      <!-- Top Action Bar (hidden on print) -->
      <div class="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span class="text-sm font-bold text-slate-800 dark:text-slate-100">Official Rental Agreement & Invoice PDF</span>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="triggerPrint"
            class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231a1.125 1.125 0 01-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-19.126 0C1.168 7.441.4 8.375.4 9.456v6.294A2.25 2.25 0 002.65 18h1.091" />
            </svg>
            Print / Save as PDF
          </button>
          
          <button @click="emit('close')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Printable Document Container -->
      <div id="printable-contract" class="p-8 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200 print:text-black print:bg-white print:p-0">
        
        <!-- Header / Logo -->
        <div class="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-6 print:border-slate-300">
          <div>
            <div class="flex items-center gap-2">
              <span class="p-2 bg-brand-500 text-white font-black text-xl rounded-xl">NR</span>
              <span class="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white print:text-black">Neighbour Renting</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Peer-to-Peer Neighborhood Equipment Rental Agreement</p>
          </div>

          <div class="text-right">
            <span class="px-3 py-1 bg-brand-100 text-brand-800 font-mono font-bold text-xs rounded-lg uppercase tracking-wider">
              {{ contractNumber }}
            </span>
            <p class="text-[11px] text-slate-500 mt-1">Issued: {{ formattedDate(rental?.created_at || Date.now()) }}</p>
            <p class="text-[11px] text-emerald-600 font-bold">Status: CONFIRMED & ACTIVE</p>
          </div>
        </div>

        <!-- Parties Details -->
        <div class="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 print:bg-slate-50 print:border-slate-300">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lender / Equipment Owner</span>
            <p class="text-sm font-bold text-slate-900 dark:text-white print:text-black mt-0.5">{{ rental?.owner?.name || 'Verified Lender' }}</p>
            <div class="mt-1 flex items-center gap-2">
              <IdentityBadge :is-verified="true" badge-type="trusted_lender" size="sm" />
            </div>
          </div>

          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Renter / Authorized Operator</span>
            <p class="text-sm font-bold text-slate-900 dark:text-white print:text-black mt-0.5">{{ rental?.renter?.name || 'Verified Renter' }}</p>
            <div class="mt-1 flex items-center gap-2">
              <IdentityBadge :is-verified="true" badge-type="verified_renter" size="sm" />
            </div>
          </div>
        </div>

        <!-- Rental Item Overview -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Equipment & Duration Details</h4>
          <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img
                :src="rental?.listing?.image_url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=150'"
                class="w-16 h-16 rounded-xl object-cover border border-slate-200"
              />
              <div>
                <h5 class="text-base font-bold text-slate-900 dark:text-white print:text-black">{{ rental?.listing?.title }}</h5>
                <p class="text-xs text-slate-500">Daily Rate: ${{ rental?.listing?.daily_rate || 0 }}/day</p>
              </div>
            </div>

            <div class="text-right">
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ formattedDate(rental?.start_date) }} → {{ formattedDate(rental?.end_date) }}
              </p>
              <p class="text-xs font-bold text-brand-600 mt-0.5">{{ rental?.total_days || 1 }} Rental Days</p>
            </div>
          </div>
        </div>

        <!-- Financial Breakdown Table -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Itemized Financial Breakdown</h4>
          <div class="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs">
            <div class="bg-slate-100 dark:bg-slate-800 p-3 grid grid-cols-3 font-bold text-slate-700 dark:text-slate-300">
              <span class="col-span-2">Description</span>
              <span class="text-right">Amount (USD)</span>
            </div>

            <div class="p-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3">
              <span class="col-span-2">Equipment Rental Fee ({{ rental?.total_days || 1 }} days @ ${{ rental?.listing?.daily_rate }}/day)</span>
              <span class="text-right font-semibold">${{ ((rental?.total_days || 1) * (rental?.listing?.daily_rate || 0)).toFixed(2) }}</span>
            </div>

            <div class="p-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 bg-slate-50/50">
              <span class="col-span-2">Protection Insurance Plan ({{ insurancePlanLabel }})</span>
              <span class="text-right font-semibold">${{ Number(rental?.insurance_fee || 0).toFixed(2) }}</span>
            </div>

            <div class="p-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3">
              <span class="col-span-2">Refundable Security Deposit Hold</span>
              <span class="text-right font-semibold text-amber-600">${{ Number(rental?.security_deposit || 0).toFixed(2) }}</span>
            </div>

            <div class="p-3.5 border-t-2 border-slate-900 dark:border-slate-100 grid grid-cols-3 font-extrabold text-sm bg-slate-100/80 dark:bg-slate-800">
              <span class="col-span-2 text-slate-900 dark:text-white">Total Amount Charged</span>
              <span class="text-right text-brand-600">${{ Number(rental?.total_price || 0).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Contract Terms & Rules -->
        <div class="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
          <p class="font-bold text-slate-800 dark:text-slate-200">Legal Terms & Liability Highlights:</p>
          <ol class="list-decimal list-inside space-y-1">
            <li><strong>Handover Verification:</strong> Renter and Lender must perform physical condition inspection at pickup and return.</li>
            <li><strong>Care & Operation:</strong> Renter agrees to operate equipment strictly according to manufacturer recommendations.</li>
            <li><strong>Damage & Deposit:</strong> Security deposits are released within 24 hours of successful handover return. Damage beyond normal operational wear is subject to protection tier rules.</li>
          </ol>
        </div>

        <!-- Digital Signatures Footer -->
        <div class="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div class="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 text-center">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Lender Digital Authorization</span>
            <div class="py-2 text-emerald-600 font-black tracking-widest uppercase text-xs">✓ SIGNED & VERIFIED</div>
            <p class="text-[10px] text-slate-500">{{ rental?.owner?.name }}</p>
          </div>

          <div class="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 text-center">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Renter Digital Authorization</span>
            <div class="py-2 text-emerald-600 font-black tracking-widest uppercase text-xs">✓ SIGNED & VERIFIED</div>
            <p class="text-[10px] text-slate-500">{{ rental?.renter?.name }}</p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
