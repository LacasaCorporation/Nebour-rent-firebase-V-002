<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { notificationsAPI } from '../services/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mobileMenuOpen = ref(false)
const scrolled = ref(false)
const userDropdownOpen = ref(false)

const isAuthenticated = computed(() => authStore.isAuthenticated.value)
const user = computed(() => authStore.currentUser.value)
const unreadCount = ref(0)

const notifications = ref<any[]>([])
const notificationDropdownOpen = ref(false)
const notificationLoading = ref(false)
let pollInterval: number | null = null

async function fetchUnreadCount() {
  try {
    const res = await notificationsAPI.unreadCount()
    unreadCount.value = res.data.count
  } catch {
    // ignore
  }
}

async function fetchNotifications() {
  try {
    notificationLoading.value = true
    const res = await notificationsAPI.getAll()
    notifications.value = res.data.notifications || res.data.data || []
  } catch {
    // ignore
  } finally {
    notificationLoading.value = false
  }
}

async function handleMarkAllAsRead() {
  try {
    await notificationsAPI.markAllAsRead()
    notifications.value.forEach(n => (n.read_at = new Date().toISOString()))
    unreadCount.value = 0
  } catch {
    // ignore
  }
}

async function toggleNotificationDropdown() {
  notificationDropdownOpen.value = !notificationDropdownOpen.value
  if (notificationDropdownOpen.value) {
    await fetchNotifications()
  }
}

function closeNotificationsDropdown() {
  notificationDropdownOpen.value = false
}

function handleNotificationClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.notification-dropdown-container')) {
    notificationDropdownOpen.value = false
  }
}

function timeAgo(date: string | Date): string {
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

const navLinks = computed(() => {
  if (isAuthenticated.value) {
    return [
      { to: '/', label: 'Explore', icon: 'search' },
      { to: '/listings', label: 'Browse', icon: 'grid' },
      { to: '/map', label: 'Map', icon: 'map' },
      { to: '/my-rentals', label: 'Rentals', icon: 'calendar' },
      { to: '/products', label: 'Products', icon: 'box' },
      { to: '/create-listing', label: 'List', icon: 'plus' },
      { to: '/company/dashboard', label: 'Company', icon: 'building' },
      { to: '/messages', label: 'Inbox', icon: 'message' },
      { to: '/settings', label: 'Settings', icon: 'gear' },
    ]
  }
  return [
    { to: '/', label: 'Explore', icon: 'search' },
    { to: '/listings', label: 'Browse', icon: 'grid' },
    { to: '/map', label: 'Map', icon: 'map' },
    { to: '/products', label: 'Products', icon: 'box' },
  ]
})

function handleScroll() {
  scrolled.value = window.scrollY > 10
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

function toggleUserDropdown() {
  userDropdownOpen.value = !userDropdownOpen.value
}

function closeUserDropdown() {
  userDropdownOpen.value = false
}

async function logout() {
  await authStore.logout()
  userDropdownOpen.value = false
  router.push('/')
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.user-dropdown-container')) {
    userDropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('click', handleNotificationClickOutside)
  fetchUnreadCount()
  pollInterval = window.setInterval(fetchUnreadCount, 30000)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('click', handleNotificationClickOutside)
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <!-- Desktop Sidebar -->
  <aside class="hidden lg:flex fixed top-0 left-0 h-screen w-[80px] flex-col items-center py-6 bg-white border-r border-warm-200 z-50">

    <!-- Logo -->
    <router-link to="/" class="flex items-center justify-center w-10 h-10 mb-8 group">
      <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg group-hover:bg-brand-600 transition-colors">
        N
      </div>
    </router-link>

    <!-- Nav Items -->
    <nav class="flex-1 flex flex-col items-center gap-1 w-full">
      <router-link
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center justify-center w-full py-3 text-warm-400 hover:text-warm-800 transition-colors group"
        :class="{ 'text-warm-800': route.path === link.to }"
      >
        <!-- Search -->
        <svg v-if="link.icon === 'search'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <!-- Grid -->
        <svg v-else-if="link.icon === 'grid'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
        </svg>
        <!-- Map -->
        <svg v-else-if="link.icon === 'map'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503-14.33 4.755 1.585a.75.75 0 0 1 .512.711V18a.75.75 0 0 1-.512.712l-5.25 1.75a.75.75 0 0 1-.456 0l-5.25-1.75a.75.75 0 0 1-.456 0l-5.25 1.75A.75.75 0 0 1 3 19.75V5.5a.75.75 0 0 1 .512-.712l5.25-1.75a.75.75 0 0 1 .456 0l5.25 1.75Z" />
        </svg>
        <!-- Calendar / Rentals -->
        <svg v-else-if="link.icon === 'calendar'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
        <!-- Box -->
        <svg v-else-if="link.icon === 'box'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
        <!-- Plus -->
        <svg v-else-if="link.icon === 'plus'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <!-- Message -->
        <svg v-else-if="link.icon === 'message'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
        <!-- Building -->
        <svg v-else-if="link.icon === 'building'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <!-- Gear -->
        <svg v-else-if="link.icon === 'gear'" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>

        <span class="text-[10px] font-medium mt-1">{{ link.label }}</span>

        <!-- Active indicator -->
        <div
          v-if="route.path === link.to"
          class="absolute left-0 w-[3px] h-6 bg-brand-500 rounded-r-full"
        ></div>
      </router-link>
    </nav>

    <!-- Notification Bell -->
    <div v-if="isAuthenticated" class="notification-dropdown-container relative mb-2">
      <button
        @click.stop="toggleNotificationDropdown"
        class="relative w-10 h-10 rounded-full bg-warm-50 flex items-center justify-center text-warm-400 hover:bg-warm-100 hover:text-warm-700 transition-colors"
        title="Notifications"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown -->
      <Transition name="fade">
        <div
          v-if="notificationDropdownOpen"
          class="absolute left-full bottom-0 ml-3 w-72 bg-white rounded-xl shadow-lg border border-warm-200 z-50 max-h-[70vh] flex flex-col"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-warm-100">
            <h3 class="font-semibold text-warm-900 text-sm">Notifications</h3>
            <button
              v-if="unreadCount > 0"
              @click="handleMarkAllAsRead"
              class="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Mark all as read
            </button>
          </div>

          <div class="overflow-y-auto flex-1">
            <template v-if="notificationLoading">
              <div class="flex items-center justify-center py-8">
                <div class="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </template>
            <template v-else-if="notifications.length === 0">
              <p class="text-center text-warm-400 text-sm py-8">No notifications yet</p>
            </template>
            <div
              v-for="notification in notifications.slice(0, 10)"
              :key="notification.id"
              class="px-4 py-3 border-b border-warm-50 hover:bg-warm-50 transition-colors cursor-pointer"
              :class="{ 'bg-brand-50/30': !notification.read_at }"
            >
              <p class="text-sm text-warm-800">{{ notification.data.message }}</p>
              <p class="text-xs text-warm-400 mt-1">{{ timeAgo(notification.created_at) }}</p>
            </div>
          </div>

          <router-link
            to="/notifications"
            @click="closeNotificationsDropdown"
            class="block text-center text-sm text-brand-600 font-medium py-3 border-t border-warm-100 hover:bg-warm-50 transition-colors rounded-b-xl"
          >
            View all notifications
          </router-link>
        </div>
      </Transition>
    </div>

    <!-- Auth Buttons / User Avatar -->
    <div class="user-dropdown-container relative mb-2">
      <template v-if="isAuthenticated && user">
        <button
          @click.stop="toggleUserDropdown"
          class="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-warm-300 transition-colors"
        >
          <div class="w-full h-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-sm">
            {{ user.name?.charAt(0).toUpperCase() }}
          </div>
        </button>
      </template>
      <template v-else>
        <div class="flex flex-col items-center gap-2">
          <router-link
            to="/login"
            class="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 hover:bg-brand-100 hover:text-brand-700 transition-colors"
            title="Log in"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </router-link>
          <router-link
            to="/register"
            class="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-warm-500 hover:bg-warm-200 hover:text-warm-700 transition-colors"
            title="Register"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </router-link>
        </div>
      </template>

      <!-- Dropdown -->
      <Transition name="fade">
        <div
          v-if="userDropdownOpen && isAuthenticated"
          class="absolute left-full bottom-0 ml-3 w-60 bg-white rounded-xl shadow-lg border border-warm-200 py-2 z-50"
        >
          <div class="px-4 py-3 border-b border-warm-100">
            <p class="font-semibold text-warm-900 text-sm">{{ user?.name }}</p>
            <p class="text-xs text-warm-500 mt-0.5">{{ user?.email }}</p>
          </div>

          <router-link
            to="/profile"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="closeUserDropdown"
          >
            <svg class="w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            My profile
          </router-link>

          <router-link
            to="/settings"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="closeUserDropdown"
          >
            <svg class="w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Settings
          </router-link>

          <router-link
            to="/my-listings"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="closeUserDropdown"
          >
            <svg class="w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21h3.75m-3.75 0h-1.5m1.5 0h1.5m0 0h1.5m-1.5 0h-1.5m-3.75 0h1.5m0 0h1.5M6.75 9h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h.75m-.75-3h.75m-.75 3h.75M12 3v3.75m0 6V18m0-3.75V15m0 3.75V21" />
            </svg>
            My listings
          </router-link>

          <router-link
            to="/my-rentals"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="closeUserDropdown"
          >
            <svg class="w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            My rentals
          </router-link>

          <router-link
            to="/products"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="closeUserDropdown"
          >
            <svg class="w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            My products
          </router-link>

          <div class="border-t border-warm-100 mt-1 pt-1">
            <button
              @click="logout"
              class="flex items-center gap-3 px-4 py-2.5 text-sm text-warm-600 hover:bg-warm-50 hover:text-warm-800 transition-colors w-full"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </aside>

  <!-- Mobile Top Bar -->
  <header class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-warm-200 flex items-center justify-between px-4 z-50">
    <router-link to="/" class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
        N
      </div>
      <span class="font-semibold text-warm-900 text-lg">neighbour</span>
    </router-link>

    <template v-if="isAuthenticated && user">
      <button
        @click="mobileMenuOpen = !mobileMenuOpen"
        class="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center"
      >
        <div class="w-full h-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs rounded-full">
          {{ user.name?.charAt(0).toUpperCase() }}
        </div>
      </button>
    </template>
    <template v-else>
      <div class="flex items-center gap-2">
        <router-link
          to="/login"
          class="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 hover:bg-brand-100 transition-colors"
          title="Log in"
        >
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </router-link>
        <router-link
          to="/register"
          class="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center text-warm-500 hover:bg-warm-200 hover:text-warm-700 transition-colors"
          title="Register"
        >
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </router-link>
      </div>
    </template>
  </header>

  <!-- Mobile Menu Overlay -->
  <Transition name="fade">
    <div
      v-if="mobileMenuOpen"
      class="lg:hidden fixed inset-0 bg-black/20 z-40"
      @click="mobileMenuOpen = false"
    ></div>
  </Transition>

  <!-- Mobile Slide Menu -->
  <Transition name="slide-right">
    <div
      v-if="mobileMenuOpen"
      class="lg:hidden fixed top-16 right-0 w-72 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white border-l border-warm-200 z-50 shadow-xl"
    >
      <div class="p-4 pb-safe">
        <div class="flex items-center gap-3 mb-4 pb-4 border-b border-warm-100">
          <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center">
            {{ user?.name?.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="font-semibold text-warm-900 text-sm">{{ user?.name }}</p>
            <p class="text-xs text-warm-500">{{ user?.email }}</p>
          </div>
        </div>

        <nav class="space-y-1">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
            :class="route.path === link.to ? 'bg-brand-50 text-brand-700 font-medium' : 'text-warm-700 hover:bg-warm-50'"
            @click="mobileMenuOpen = false"
          >
            {{ link.label }}
          </router-link>

          <router-link
            to="/notifications"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="mobileMenuOpen = false"
          >
            <template v-if="unreadCount > 0">
              Notifications
              <span class="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </template>
            <template v-else>Notifications</template>
          </router-link>

          <router-link
            to="/my-listings"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="mobileMenuOpen = false"
          >
            <svg class="w-4 h-4 text-warm-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21h3.75m-3.75 0h-1.5m1.5 0h1.5m0 0h1.5m-1.5 0h-1.5m-3.75 0h1.5m0 0h1.5M6.75 9h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21h.75m-.75-3h.75m-.75 3h.75M12 3v3.75m0 6V18m0-3.75V15m0 3.75V21" />
            </svg>
            My listings
          </router-link>

          <router-link
            to="/profile"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="mobileMenuOpen = false"
          >
            My profile
          </router-link>

          <router-link
            to="/products"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="mobileMenuOpen = false"
          >
            My products
          </router-link>

          <router-link
            to="/settings"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-warm-700 hover:bg-warm-50 transition-colors"
            @click="mobileMenuOpen = false"
          >
            Settings
          </router-link>

          <button
            @click="logout"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-warm-600 hover:bg-warm-50 transition-colors w-full"
          >
            Log out
          </button>
        </nav>
      </div>
    </div>
  </Transition>
</template>
