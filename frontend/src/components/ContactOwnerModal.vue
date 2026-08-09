<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { listingFirstImage } from '../utils/imageUrl'

const props = defineProps<{
  show: boolean
  listing: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const messageContent = ref('')
const sending = ref(false)

const quickQuestions = [
  'Is this item available for pickup this week?',
  'What accessories or components are included?',
  'Is a deposit required upon pickup?',
  'Hi! I would like to learn more about renting this item.'
]

const ownerName = computed(() => {
  return props.listing?.owner_name || props.listing?.company?.name || props.listing?.user?.name || 'Item Owner'
})

const ownerId = computed(() => {
  return props.listing?.user_id || props.listing?.user?.id || props.listing?.company?.user_id
})

function selectQuickQuestion(text: string) {
  messageContent.value = text
}

async function handleSendMessage() {
  if (!messageContent.value.trim()) {
    toast.error('Please enter a message content')
    return
  }

  if (!authStore.isAuthenticated) {
    toast.error('Please log in to contact item owners')
    router.push('/login')
    return
  }

  if (!ownerId.value) {
    toast.error('Could not identify item owner')
    return
  }

  sending.value = true
  try {
    const payload = {
      receiver_id: ownerId.value,
      content: `[Inquiry regarding "${props.listing.title}"]\n${messageContent.value.trim()}`,
      listing_id: props.listing.id
    }

    await api.post('/messages', payload)
    toast.success(`Message sent to ${ownerName.value}!`)
    const targetUserId = ownerId.value
    messageContent.value = ''
    emit('close')

    // Navigate to conversation thread
    router.push(`/messages/${targetUserId}`)
  } catch (err: any) {
    console.error('Failed to send message:', err)
    toast.error(err.response?.data?.error || 'Failed to send message. Please try again.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-900/60 backdrop-blur-sm overflow-y-auto"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-3xl border border-warm-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <!-- Header -->
        <div class="p-5 border-b border-warm-100 bg-warm-50/60 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-lg shrink-0">
              💬
            </div>
            <div>
              <h3 class="font-bold text-warm-900 text-base">Contact Item Owner</h3>
              <p class="text-xs text-warm-500 font-medium">Direct message regarding this rental</p>
            </div>
          </div>

          <button
            @click="emit('close')"
            class="p-2 text-warm-400 hover:text-warm-700 rounded-xl hover:bg-warm-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5">

          <!-- Item Snapshot Card -->
          <div class="flex items-center gap-3.5 p-3 rounded-2xl bg-warm-50 border border-warm-200/80">
            <div class="w-16 h-16 rounded-xl bg-warm-200 overflow-hidden shrink-0 border border-warm-200">
              <img
                v-if="listingFirstImage(listing)"
                :src="listingFirstImage(listing)"
                :alt="listing?.title"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-warm-400">📦</div>
            </div>

            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-warm-900 text-sm truncate">{{ listing?.title }}</h4>
              <p class="text-xs text-warm-500 truncate mt-0.5">📍 {{ listing?.location || 'Local' }}</p>
              <div class="flex items-center justify-between mt-1">
                <span class="font-bold text-xs text-brand-700">${{ Number(listing?.daily_rate || 0).toFixed(0) }}/day</span>
                <span class="text-[11px] text-warm-500 font-medium">Owner: {{ ownerName }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Prompts -->
          <div>
            <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider mb-2">
              Quick Suggestions
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="(q, idx) in quickQuestions"
                :key="idx"
                type="button"
                @click="selectQuickQuestion(q)"
                class="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-warm-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 text-warm-700 border border-warm-200/80 transition-all text-left cursor-pointer"
              >
                {{ q }}
              </button>
            </div>
          </div>

          <!-- Message Textarea -->
          <div>
            <label class="block text-xs font-bold text-warm-700 uppercase tracking-wider mb-1.5">
              Your Message
            </label>
            <textarea
              v-model="messageContent"
              rows="4"
              placeholder="Ask about availability, condition, delivery options, or rental details..."
              class="w-full px-4 py-3 rounded-2xl border border-warm-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 text-xs text-warm-900 placeholder:text-warm-400 font-medium bg-white"
            ></textarea>
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="p-5 border-t border-warm-100 bg-warm-50/40 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 rounded-xl text-xs font-bold text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            @click="handleSendMessage"
            :disabled="sending || !messageContent.trim()"
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <div v-if="sending" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
            <span>Send Direct Message</span>
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>
