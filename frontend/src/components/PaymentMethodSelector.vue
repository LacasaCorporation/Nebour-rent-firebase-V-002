<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  dailyRate?: number
  securityDeposit?: number
  totalDays?: number
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:cardDetails': [value: { cardNumber: string; expiry: string; cvv: string; cardLastFour: string }]
}>()

const selectedMethod = ref(props.modelValue || 'card')

// Card form state
const cardNumber = ref('4242 •••• •••• 4242')
const cardExpiry = ref('12/28')
const cardCvv = ref('123')
const zipCode = ref('11215')
const saveCard = ref(true)

watch(selectedMethod, (newVal) => {
  emit('update:modelValue', newVal)
  emitCardData()
})

function emitCardData() {
  const digitsOnly = cardNumber.value.replace(/\D/g, '')
  const lastFour = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : '4242'
  emit('update:cardDetails', {
    cardNumber: cardNumber.value,
    expiry: cardExpiry.value,
    cvv: cardCvv.value,
    cardLastFour: lastFour
  })
}

// Pricing breakdowns
const days = computed(() => Math.max(1, props.totalDays || 1))
const rate = computed(() => props.dailyRate || 0)
const rentalSubtotal = computed(() => days.value * rate.value)
const deposit = computed(() => props.securityDeposit || 0)
const serviceFee = computed(() => Math.round(rentalSubtotal.value * 0.10 * 100) / 100) // 10% platform protection
const grandTotal = computed(() => rentalSubtotal.value + deposit.value + serviceFee.value)

function selectMethod(id: string) {
  selectedMethod.value = id
}
</script>

<template>
  <div class="space-y-4 text-warm-900">
    <!-- Payment Option Tabs -->
    <div>
      <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider mb-2">
        Select Payment Method
      </label>

      <div class="grid grid-cols-2 gap-2">
        <!-- Credit / Debit Card -->
        <button
          type="button"
          @click="selectMethod('card')"
          :class="[
            selectedMethod === 'card'
              ? 'bg-brand-50/90 border-brand-500 text-brand-900 ring-2 ring-brand-200'
              : 'bg-white border-warm-200 text-warm-700 hover:border-warm-300',
            'p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer'
          ]"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-base">💳</span>
            <span v-if="selectedMethod === 'card'" class="w-2 h-2 rounded-full bg-brand-500"></span>
          </div>
          <div>
            <p class="font-bold text-xs">Credit / Debit Card</p>
            <p class="text-[10px] text-warm-500">Visa, Mastercard, Amex</p>
          </div>
        </button>

        <!-- Express Pay (Apple/Google Pay) -->
        <button
          type="button"
          @click="selectMethod('express')"
          :class="[
            selectedMethod === 'express'
              ? 'bg-brand-50/90 border-brand-500 text-brand-900 ring-2 ring-brand-200'
              : 'bg-white border-warm-200 text-warm-700 hover:border-warm-300',
            'p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer'
          ]"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-base">🍎</span>
            <span v-if="selectedMethod === 'express'" class="w-2 h-2 rounded-full bg-brand-500"></span>
          </div>
          <div>
            <p class="font-bold text-xs">Apple / Google Pay</p>
            <p class="text-[10px] text-warm-500">Fast 1-Touch Checkout</p>
          </div>
        </button>

        <!-- Peer to Peer (Venmo / PayPal / Zelle) -->
        <button
          type="button"
          @click="selectMethod('p2p')"
          :class="[
            selectedMethod === 'p2p'
              ? 'bg-brand-50/90 border-brand-500 text-brand-900 ring-2 ring-brand-200'
              : 'bg-white border-warm-200 text-warm-700 hover:border-warm-300',
            'p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer'
          ]"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-base">💸</span>
            <span v-if="selectedMethod === 'p2p'" class="w-2 h-2 rounded-full bg-brand-500"></span>
          </div>
          <div>
            <p class="font-bold text-xs">Venmo / PayPal</p>
            <p class="text-[10px] text-warm-500">Digital Wallet Transfer</p>
          </div>
        </button>

        <!-- Cash on Pickup -->
        <button
          type="button"
          @click="selectMethod('cash')"
          :class="[
            selectedMethod === 'cash'
              ? 'bg-brand-50/90 border-brand-500 text-brand-900 ring-2 ring-brand-200'
              : 'bg-white border-warm-200 text-warm-700 hover:border-warm-300',
            'p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer'
          ]"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-base">🤝</span>
            <span v-if="selectedMethod === 'cash'" class="w-2 h-2 rounded-full bg-brand-500"></span>
          </div>
          <div>
            <p class="font-bold text-xs">Cash on Handover</p>
            <p class="text-[10px] text-warm-500">Pay Owner at Pickup</p>
          </div>
        </button>
      </div>
    </div>

    <!-- Active Payment Form Details -->
    <!-- 1. Card Form -->
    <div v-if="selectedMethod === 'card'" class="p-3.5 bg-warm-50/80 rounded-2xl border border-warm-200/90 space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-warm-700 uppercase tracking-wider">Card Details</span>
        <div class="flex items-center gap-1">
          <span class="text-[10px] bg-white px-1.5 py-0.5 rounded border border-warm-200 font-mono font-bold text-warm-600">VISA</span>
          <span class="text-[10px] bg-white px-1.5 py-0.5 rounded border border-warm-200 font-mono font-bold text-warm-600">MC</span>
          <span class="text-[10px] bg-white px-1.5 py-0.5 rounded border border-warm-200 font-mono font-bold text-warm-600">AMEX</span>
        </div>
      </div>

      <div>
        <label class="block text-[10px] font-bold text-warm-500 uppercase mb-0.5">Card Number</label>
        <input
          v-model="cardNumber"
          @input="emitCardData"
          type="text"
          placeholder="4242 4242 4242 4242"
          class="w-full px-3 py-2 bg-white rounded-xl border border-warm-200 text-xs font-mono font-bold text-warm-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="block text-[10px] font-bold text-warm-500 uppercase mb-0.5">Expires</label>
          <input
            v-model="cardExpiry"
            type="text"
            placeholder="MM/YY"
            class="w-full px-2.5 py-2 bg-white rounded-xl border border-warm-200 text-xs font-mono text-center font-bold text-warm-900 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-warm-500 uppercase mb-0.5">CVV</label>
          <input
            v-model="cardCvv"
            type="password"
            maxlength="4"
            placeholder="123"
            class="w-full px-2.5 py-2 bg-white rounded-xl border border-warm-200 text-xs font-mono text-center font-bold text-warm-900 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-warm-500 uppercase mb-0.5">ZIP Code</label>
          <input
            v-model="zipCode"
            type="text"
            placeholder="11215"
            class="w-full px-2.5 py-2 bg-white rounded-xl border border-warm-200 text-xs font-mono text-center font-bold text-warm-900 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <label class="flex items-center gap-2 cursor-pointer pt-1">
        <input v-model="saveCard" type="checkbox" class="rounded text-brand-600 focus:ring-brand-500" />
        <span class="text-[11px] font-medium text-warm-600">Save encrypted card for quick 1-click future rentals</span>
      </label>
    </div>

    <!-- 2. Express Pay Details -->
    <div v-else-if="selectedMethod === 'express'" class="p-4 bg-warm-50/80 rounded-2xl border border-warm-200/90 text-center space-y-2">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black text-white text-xl font-bold mb-1 shadow-md">
         Pay
      </div>
      <p class="text-xs font-bold text-warm-900">Apple Pay / Google Pay Authorized</p>
      <p class="text-[11px] text-warm-500 leading-relaxed max-w-xs mx-auto">
        Your payment will be securely authorized using your device's biometric security (FaceID/TouchID) upon confirming your request.
      </p>
    </div>

    <!-- 3. Venmo / PayPal Details -->
    <div v-else-if="selectedMethod === 'p2p'" class="p-3.5 bg-warm-50/80 rounded-2xl border border-warm-200/90 space-y-2">
      <div class="flex items-center gap-2 text-xs font-bold text-warm-900">
        <span class="p-1 bg-sky-100 text-sky-700 rounded-lg">📱</span>
        <span>Venmo / PayPal Account</span>
      </div>
      <input
        type="text"
        placeholder="@your-username or email"
        value="@renter-neighbor"
        class="w-full px-3 py-2 bg-white rounded-xl border border-warm-200 text-xs font-medium text-warm-900 focus:outline-none focus:border-brand-500"
      />
      <p class="text-[10px] text-warm-500">
        Payment hold will be placed via PayPal Protection until the owner approves your rental dates.
      </p>
    </div>

    <!-- 4. Cash on Pickup Details -->
    <div v-else-if="selectedMethod === 'cash'" class="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 space-y-1.5">
      <div class="flex items-center gap-2 text-xs font-bold text-emerald-900">
        <span>🤝 Pay Cash / In-Person</span>
      </div>
      <p class="text-[11px] text-emerald-800 leading-relaxed">
        You will pay the owner directly when picking up the item. No immediate charge will be made to your credit card today.
      </p>
    </div>

    <!-- Price Summary Box -->
    <div class="p-3.5 bg-warm-100/70 rounded-2xl border border-warm-200/80 space-y-1.5 text-xs">
      <div class="flex justify-between text-warm-600">
        <span>Rental ({{ days }} {{ days === 1 ? 'day' : 'days' }} @ ${{ rate }}/day)</span>
        <span class="font-bold text-warm-800">${{ rentalSubtotal.toFixed(2) }}</span>
      </div>

      <div v-if="deposit > 0" class="flex justify-between text-warm-600">
        <span>Refundable Security Deposit</span>
        <span class="font-bold text-warm-800">${{ deposit.toFixed(2) }}</span>
      </div>

      <div class="flex justify-between text-warm-600">
        <span>Neighbor Guarantee Fee (10%)</span>
        <span class="font-bold text-warm-800">${{ serviceFee.toFixed(2) }}</span>
      </div>

      <div class="pt-2 border-t border-warm-200/80 flex justify-between items-center text-sm font-extrabold text-warm-900">
        <span>Total Payable</span>
        <span class="text-brand-700 text-base font-black">${{ grandTotal.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>
