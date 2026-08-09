<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { notificationsAPI } from '../../services/api'

const notifications = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await notificationsAPI.getAll()
    notifications.value = res.data?.data ?? res.data ?? []
  } catch {
    notifications.value = []
  } finally {
    loading.value = false
  }
}

async function markRead(id: number) {
  try {
    await notificationsAPI.markAsRead(id)
    const n = notifications.value.find((x: any) => x.id === id)
    if (n) n.read_at = new Date().toISOString()
  } catch {
    //
  }
}

async function markAllRead() {
  try {
    await notificationsAPI.markAllAsRead()
    notifications.value.forEach((n: any) => { n.read_at = new Date().toISOString() })
  } catch {
    //
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <h3 class="text-lg font-semibold text-warm-900">Notifications</h3>
      <button
        v-if="notifications.length > 0"
        @click="markAllRead"
        class="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
      >
        Mark all as read
      </button>
    </div>
    <p class="text-sm text-warm-500 mb-6">Stay updated on your activity.</p>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="notifications.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 text-warm-300 mx-auto mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
      <p class="text-warm-500 text-sm">No notifications yet.</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        :class="['p-4 rounded-lg border transition-colors cursor-pointer', n.read_at ? 'bg-white border-warm-200' : 'bg-brand-50/50 border-brand-200']"
        @click="!n.read_at ? markRead(n.id) : null"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p :class="['text-sm', n.read_at ? 'text-warm-700' : 'text-warm-900 font-medium']">
              {{ n.title ?? n.message ?? n.data?.message ?? 'Notification' }}
            </p>
            <p v-if="!n.read_at" class="text-xs text-warm-400 mt-0.5">{{ formatDate(n.created_at) }}</p>
          </div>
          <div v-if="!n.read_at" class="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
        </div>
      </div>
    </div>
  </div>
</template>
