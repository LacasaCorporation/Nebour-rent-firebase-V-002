<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api.js'
import { useAuthStore } from '../stores/auth.js'

const route = useRoute()
const authStore = useAuthStore()
const conversations = ref([])
const messages = ref([])
const newMessage = ref('')
const otherUserName = ref('')
const otherUserOnline = ref(false)
const otherUserLastSeen = ref('')
const messagesContainer = ref(null)
const fileInput = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const showSearch = ref(false)
const isTyping = ref(false)
const typingTimeout = ref(null)
const replyTo = ref(null)
const nextCursor = ref(null)
const hasMore = ref(false)
const loadingOlder = ref(false)
const attachment = ref(null)

const currentUserId = computed(() => authStore.currentUser?.id)

function onScroll() {
  if (messagesContainer.value && messagesContainer.value.scrollTop < 50) {
    loadOlder()
  }
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function statusIcon(status) {
  if (status === 'read') return '✓✓'
  if (status === 'delivered') return '✓✓'
  return '✓'
}

function statusColor(status) {
  if (status === 'read') return 'text-sky-300'
  if (status === 'delivered') return 'text-white/60'
  return 'text-white/40'
}

async function fetchConversations() {
  const res = await api.get('/conversations')
  conversations.value = res.data
}

async function fetchMessages(userId, { append = false } = {}) {
  if (!userId) return
  const params = {}
  if (append && nextCursor.value) params.cursor = nextCursor.value
  const res = await api.get(`/messages/${userId}`, { params })
  if (append) {
    messages.value = [...res.data.messages, ...messages.value]
  } else {
    messages.value = res.data.messages
  }
  otherUserName.value = res.data.other_user_name
  otherUserOnline.value = res.data.other_user_online
  otherUserLastSeen.value = res.data.other_user_last_seen
  nextCursor.value = res.data.next_cursor
  hasMore.value = res.data.has_more
  await nextTick()
  if (!append && messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function loadOlder() {
  if (!hasMore.value || loadingOlder.value) return
  loadingOlder.value = true
  const prevHeight = messagesContainer.value?.scrollHeight || 0
  await fetchMessages(route.params.userId, { append: true })
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight - prevHeight
  }
  loadingOlder.value = false
}

async function sendMessage() {
  const body = newMessage.value.trim()
  if (!body && !attachment.value) return

  const formData = new FormData()
  formData.append('receiver_id', parseInt(route.params.userId))
  formData.append('body', body)
  if (replyTo.value) formData.append('reply_to_id', replyTo.value.id)
  if (attachment.value) formData.append('attachment', attachment.value)

  const res = await api.post('/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  messages.value.push(res.data)
  newMessage.value = ''
  attachment.value = null
  replyTo.value = null
  if (fileInput.value) fileInput.value.value = ''
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
  fetchConversations()
}

function onFileSelected(e) {
  attachment.value = e.target.files[0] || null
}

function removeAttachment() {
  attachment.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function onTyping() {
  if (!route.params.userId) return
  api.post(`/messages/${route.params.userId}/typing`, { is_typing: true }).catch(() => {})
  clearTimeout(replyTimeout.value)
  replyTimeout.value = setTimeout(() => {
    api.post(`/messages/${route.params.userId}/typing`, { is_typing: false }).catch(() => {})
  }, 3000)
}

const replyTimeout = ref(null)

function setReply(message) {
  replyTo.value = message
}

function cancelReply() {
  replyTo.value = null
}

async function deleteMessage(message, forEveryone = false) {
  if (!confirm(forEveryone ? 'Delete this message for everyone?' : 'Delete this message for you?')) return
  const res = await api.delete(`/messages/${message.id}`, { data: { for_everyone: forEveryone } })
  if (res.data.for_everyone) {
    messages.value = messages.value.filter(m => m.id !== message.id)
  } else {
    const idx = messages.value.findIndex(m => m.id === message.id)
    if (idx !== -1) messages.value[idx] = { ...messages.value[idx], body: '🚫 This message was deleted', deleted: true }
  }
  fetchConversations()
}

async function searchMessages() {
  if (searchQuery.value.trim().length < 2) { searchResults.value = []; return }
  const res = await api.get(`/messages/${route.params.userId}/search`, { params: { q: searchQuery.value } })
  searchResults.value = res.data.messages
}

function jumpToMessage(id) {
  showSearch.value = false
  searchQuery.value = ''
  const el = document.getElementById(`msg-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-brand-400')
    setTimeout(() => el.classList.remove('ring-2', 'ring-brand-400'), 2000)
  }
}

let pollTimer = null
let typingPollTimer = null
let onlineTimer = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (route.params.userId) fetchMessages(route.params.userId)
  }, 5000)
  typingPollTimer = setInterval(async () => {
    if (!route.params.userId) return
    const res = await api.get(`/messages/${route.params.userId}/typing`).catch(() => ({ data: { is_typing: false } }))
    isTyping.value = res.data.is_typing
  }, 3000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (typingPollTimer) { clearInterval(typingPollTimer); typingPollTimer = null }
  if (onlineTimer) { clearInterval(onlineTimer); onlineTimer = null }
}

function markOnline() {
  api.post(`/messages/${route.params.userId}/online`).catch(() => {})
}

onMounted(() => {
  Promise.all([
    fetchConversations(),
    route.params.userId ? fetchMessages(route.params.userId) : Promise.resolve(),
  ])
  startPolling()
  markOnline()
  onlineTimer = setInterval(markOnline, 30000)
  window.addEventListener('beforeunload', () => {
    if (route.params.userId) api.post(`/messages/${route.params.userId}/offline`).catch(() => {})
  })
})

onUnmounted(() => {
  stopPolling()
  if (route.params.userId) api.post(`/messages/${route.params.userId}/offline`).catch(() => {})
})

watch(() => route.params.userId, (id) => {
  if (id) {
    fetchMessages(id)
    markOnline()
  }
})
</script>

<template>
  <div class="flex gap-0 h-[calc(100vh-4rem)]">
    <!-- Conversations Sidebar -->
    <div class="w-80 flex-shrink-0 bg-white/60 backdrop-blur-sm border-r border-warm-200 flex flex-col">
      <div class="p-5 border-b border-warm-200">
        <h2 class="text-lg font-bold text-warm-900">Messages</h2>
      </div>
      <div class="flex-1 overflow-y-auto">
        <div v-if="conversations.length" class="p-2 space-y-1">
          <router-link
            v-for="c in conversations"
            :key="c.other_user_id"
            :to="`/messages/${c.other_user_id}`"
            class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
            :class="route.params.userId == c.other_user_id ? 'bg-gradient-to-r from-brand-50 to-brand-100/50 border border-brand-200' : 'hover:bg-warm-50 border border-transparent'"
          >
            <div class="relative flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {{ c.other_user_name?.charAt(0) }}
              </div>
              <span
                v-if="c.other_user_online"
                class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
              ></span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-warm-900 truncate">{{ c.other_user_name }}</p>
                <span v-if="c.last_message_time" class="text-[0.65rem] text-warm-400 flex-shrink-0">{{ formatTime(c.last_message_time) }}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-warm-500 truncate">
                  <span v-if="c.last_message_status && c.last_message" class="mr-1" :class="statusIcon(c.last_message_status) === '✓✓' ? 'text-brand-500' : 'text-warm-400'">{{ statusIcon(c.last_message_status) }}</span>
                  {{ c.last_message }}
                </p>
                <span
                  v-if="c.unread_count > 0"
                  class="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-500 text-white text-[0.65rem] font-bold flex items-center justify-center"
                >{{ c.unread_count }}</span>
              </div>
            </div>
          </router-link>
        </div>
        <div v-else class="flex flex-col items-center justify-center h-48 text-center px-6">
          <div class="w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A2.625 2.625 0 0 1 6.375 2.25h11.25A2.625 2.625 0 0 1 20.25 4.875v10.5A2.625 2.625 0 0 1 17.625 18H7.5l-3.75 2.105Z" />
            </svg>
          </div>
          <p class="text-sm text-warm-500">No conversations yet.</p>
        </div>
      </div>
    </div>

    <!-- Chat Area -->
    <div class="flex-1 flex flex-col bg-white/30 backdrop-blur-sm">
      <template v-if="route.params.userId">
        <!-- Chat Header -->
        <div class="px-6 py-3 border-b border-warm-200 bg-white/60 backdrop-blur-sm flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {{ otherUserName?.charAt(0) }}
              </div>
              <span
                v-if="otherUserOnline"
                class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
              ></span>
            </div>
            <div>
              <h3 class="text-base font-semibold text-warm-900">{{ otherUserName }}</h3>
              <p class="text-xs" :class="otherUserOnline ? 'text-emerald-600' : 'text-warm-400'">
                <span v-if="isTyping" class="text-brand-500 font-medium">typing…</span>
                <span v-else-if="otherUserOnline">Online</span>
                <span v-else-if="otherUserLastSeen">Last seen {{ otherUserLastSeen }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="showSearch = !showSearch"
              class="p-2 rounded-lg hover:bg-warm-100 text-warm-500 transition-colors"
              title="Search messages"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div v-if="showSearch" class="px-6 py-3 border-b border-warm-200 bg-white/50">
          <input
            v-model="searchQuery"
            @input="searchMessages"
            placeholder="Search in this conversation..."
            class="w-full px-4 py-2 rounded-xl border border-warm-200 bg-white/80 text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div v-if="searchResults.length" class="mt-2 max-h-40 overflow-y-auto space-y-1">
            <button
              v-for="r in searchResults"
              :key="r.id"
              @click="jumpToMessage(r.id)"
              class="w-full text-left px-3 py-2 rounded-lg hover:bg-brand-50 text-sm"
            >
              <span class="text-warm-400 text-xs">{{ formatDate(r.created_at) }} {{ formatTime(r.created_at) }}</span>
              <p class="text-warm-800 truncate">{{ r.body }}</p>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div
          ref="messagesContainer"
          @scroll.passive="onScroll"
          class="flex-1 overflow-y-auto px-6 py-4 space-y-3"
        >
          <div v-if="loadingOlder" class="text-center text-xs text-warm-400 py-2">Loading older messages…</div>
          <div
            v-for="m in messages"
            :key="m.id"
            :id="`msg-${m.id}`"
            class="flex group"
            :class="m.is_outgoing ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative"
              :class="m.is_outgoing
                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-br-md'
                : 'bg-white/80 backdrop-blur-sm border border-warm-200 text-warm-900 rounded-bl-md'"
            >
              <!-- Reply quote -->
              <div
                v-if="m.reply_to_id"
                class="mb-1.5 px-2 py-1 rounded-lg text-xs border-l-2"
                :class="m.is_outgoing ? 'bg-white/15 border-white/40 text-white/80' : 'bg-warm-50 border-brand-300 text-warm-500'"
              >
                <span class="font-semibold block">{{ m.is_outgoing ? 'You' : otherUserName }}</span>
                <span class="truncate block max-w-[200px]">{{ messages.find(x => x.id === m.reply_to_id)?.body || '…' }}</span>
              </div>

              <!-- Attachment -->
              <div v-if="m.attachment" class="mb-1.5">
                <a
                  :href="m.attachment.url"
                  target="_blank"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg"
                  :class="m.is_outgoing ? 'bg-white/15 hover:bg-white/25' : 'bg-warm-50 hover:bg-warm-100'"
                >
                  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                  <div class="min-w-0">
                    <p class="text-xs font-medium truncate">{{ m.attachment.name }}</p>
                    <p class="text-[0.65rem] opacity-70">{{ (m.attachment.size / 1024).toFixed(1) }} KB</p>
                  </div>
                </a>
              </div>

              <p>{{ m.body }}</p>
              <div class="flex items-center justify-end gap-1 mt-1">
                <span
                  class="text-[0.65rem]"
                  :class="m.is_outgoing ? 'text-white/60' : 'text-warm-500'"
                >{{ formatTime(m.created_at) }}</span>
                <span
                  v-if="m.is_outgoing && !m.deleted"
                  class="text-[0.65rem] font-bold"
                  :class="statusColor(m.status)"
                >{{ statusIcon(m.status) }}</span>
              </div>

              <!-- Hover actions -->
              <div
                class="absolute -top-3 right-2 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-md border border-warm-200 px-1 py-0.5"
              >
                <button @click="setReply(m)" class="p-1 rounded hover:bg-warm-100 text-warm-500" title="Reply">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                </button>
                <button @click="deleteMessage(m, false)" class="p-1 rounded hover:bg-red-50 text-red-400" title="Delete for me">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
                <button
                  v-if="m.is_outgoing && new Date(m.created_at).getTime() > Date.now() - 5 * 60 * 1000"
                  @click="deleteMessage(m, true)"
                  class="text-gray-400 rounded hover:bg-red-50 hover:text-red-500" title="Delete for everyone"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Reply preview -->
        <div v-if="replyTo" class="px-6 py-2 border-t border-warm-200 bg-brand-50/50 flex items-center justify-between">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-brand-600">Replying to {{ replyTo.is_outgoing ? 'yourself' : otherUserName }}</p>
            <p class="text-xs text-warm-500 truncate">{{ replyTo.body }}</p>
          </div>
          <button @click="cancelReply" class="text-warm-400 hover:text-warm-600 p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Input -->
        <form @submit.prevent="sendMessage" class="px-6 py-4 border-t border-warm-200 bg-white/60 backdrop-blur-sm">
          <!-- Attachment preview -->
          <div v-if="attachment" class="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-warm-50 border border-warm-200">
            <svg class="w-4 h-4 text-warm-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            <span class="text-sm text-warm-700 truncate flex-1">{{ attachment.name }}</span>
            <button type="button" @click="removeAttachment" class="text-warm-400 hover:text-red-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex gap-3">
            <input
              type="file"
              ref="fileInput"
              @change="onFileSelected"
              class="hidden"
            />
            <button
              type="button"
              @click="fileInput?.click()"
              class="p-2.5 rounded-xl text-warm-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
              title="Attach file"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            <input
              v-model="newMessage"
              @input="onTyping"
              placeholder="Type a message..."
              class="flex-1 px-4 py-2.5 rounded-xl border border-warm-200 bg-white/80 text-sm text-warm-800 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <button
              type="submit"
              :disabled="!newMessage.trim() && !attachment"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </template>

      <!-- Empty state -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A2.625 2.625 0 0 1 6.375 2.25h11.25A2.625 2.625 0 0 1 20.25 4.875v10.5A2.625 2.625 0 0 1 17.625 18H7.5l-3.75 2.105Z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-warm-900 mb-1">Your Messages</h3>
        <p class="text-sm text-warm-500 max-w-xs">Select a conversation from the sidebar to start chatting.</p>
      </div>
    </div>
  </div>
</template>