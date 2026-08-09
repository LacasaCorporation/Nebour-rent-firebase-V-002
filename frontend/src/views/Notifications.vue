<script setup>
import { ref, onMounted } from 'vue'
import { notificationsAPI } from '../services/api.js'

const notifications = ref([])
const loading = ref(true)

function timeAgo(date) {
  const now = Date.now()
  const past = new Date(date).getTime()
  const diff = Math.max(0, now - past)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

async function fetchNotifications() {
  try {
    const res = await notificationsAPI.getAll()
    notifications.value = res.data.data
  } catch (e) {
    console.error('Failed to fetch notifications', e)
  } finally {
    loading.value = false
  }
}

async function handleClick(notification) {
  if (!notification.read_at) {
    try {
      await notificationsAPI.markAsRead(notification.id)
      notification.read_at = new Date().toISOString()
    } catch (e) {
      console.error('Failed to mark as read', e)
    }
  }
}

onMounted(fetchNotifications)
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-warm-900 mb-6">Notifications</h1>

    <template v-if="loading">
      <div class="flex items-center justify-center py-16">
        <div class="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </template>

    <template v-else-if="notifications.length === 0">
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-warm-900 mb-1">No notifications yet</h3>
        <p class="text-sm text-warm-500">You're all caught up!</p>
      </div>
    </template>

    <template v-else>
      <div class="space-y-2">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          @click="handleClick(notification)"
          class="p-4 rounded-xl border cursor-pointer transition-colors"
          :class="notification.read_at ? 'bg-white border-warm-200 hover:bg-warm-50' : 'bg-brand-50/40 border-brand-200 hover:bg-brand-50/60'"
        >
          <div class="flex items-start gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              :class="notification.read_at ? 'bg-warm-100' : 'bg-brand-100'"
            >
              <svg
                class="w-4 h-4"
                :class="notification.read_at ? 'text-warm-500' : 'text-brand-600'"
                fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-warm-800">{{ notification.data.message }}</p>
              <p class="text-xs mt-1" :class="notification.read_at ? 'text-warm-400' : 'text-brand-600 font-medium'">
                {{ timeAgo(notification.created_at) }}
              </p>
            </div>
            <div v-if="!notification.read_at" class="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2"></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
