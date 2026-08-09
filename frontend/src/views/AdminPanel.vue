<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminAPI } from '../services/api'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { listingImageUrl } from '../utils/imageUrl'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref<'users' | 'listings' | 'companies'>('users')
const loading = ref(true)

const stats = ref({
  total_users: 0,
  total_listings: 0,
  total_companies: 0,
  total_rentals: 0,
  total_volume: 0
})

const users = ref<any[]>([])
const listings = ref<any[]>([])
const companies = ref<any[]>([])

const userSearch = ref('')
const listingSearch = ref('')
const companySearch = ref('')

const filteredUsers = computed(() => {
  if (!userSearch.value) return users.value
  const q = userSearch.value.toLowerCase()
  return users.value.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
})

const filteredListings = computed(() => {
  if (!listingSearch.value) return listings.value
  const q = listingSearch.value.toLowerCase()
  return listings.value.filter(l => l.title?.toLowerCase().includes(q) || l.user_name?.toLowerCase().includes(q))
})

const filteredCompanies = computed(() => {
  if (!companySearch.value) return companies.value
  const q = companySearch.value.toLowerCase()
  return companies.value.filter(c => c.name?.toLowerCase().includes(q) || c.owner_name?.toLowerCase().includes(q))
})

async function loadAdminData() {
  try {
    loading.value = true
    const [statsRes, usersRes, listingsRes, companiesRes] = await Promise.all([
      adminAPI.getStats(),
      adminAPI.getUsers(),
      adminAPI.getListings(),
      adminAPI.getCompanies()
    ])

    stats.value = statsRes.data
    users.value = usersRes.data.users || []
    listings.value = listingsRes.data.listings || []
    companies.value = companiesRes.data.companies || []
  } catch (err: any) {
    toast.error('Failed to load admin panel data. Make sure you are signed in as Admin.')
  } finally {
    loading.value = false
  }
}

async function toggleUserAdmin(user: any) {
  try {
    const newRole = user.is_admin === 1 ? 0 : 1
    await adminAPI.setUserAdmin(user.id, newRole)
    user.is_admin = newRole
    toast.success(`User role updated for ${user.name}`)
  } catch (err: any) {
    toast.error('Failed to update user role.')
  }
}

async function deleteUser(user: any) {
  if (!confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) return
  try {
    await adminAPI.deleteUser(user.id)
    users.value = users.value.filter(u => u.id !== user.id)
    toast.success('User deleted successfully')
  } catch (err: any) {
    toast.error('Failed to delete user.')
  }
}

async function deleteListing(listing: any) {
  if (!confirm(`Are you sure you want to delete listing "${listing.title}"?`)) return
  try {
    await adminAPI.deleteListing(listing.id)
    listings.value = listings.value.filter(l => l.id !== listing.id)
    toast.success('Listing deleted successfully')
  } catch (err: any) {
    toast.error('Failed to delete listing.')
  }
}

async function toggleCompanyVerification(company: any) {
  try {
    const newStatus = company.is_verified === 1 ? 0 : 1
    await adminAPI.setCompanyVerified(company.id, newStatus)
    company.is_verified = newStatus
    toast.success(`Company verification updated for ${company.name}`)
  } catch (err: any) {
    toast.error('Failed to update company verification status.')
  }
}

async function deleteCompany(company: any) {
  if (!confirm(`Are you sure you want to delete company "${company.name}"?`)) return
  try {
    await adminAPI.deleteCompany(company.id)
    companies.value = companies.value.filter(c => c.id !== company.id)
    toast.success('Company deleted successfully')
  } catch (err: any) {
    toast.error('Failed to delete company.')
  }
}

onMounted(() => {
  loadAdminData()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    
    <!-- Admin Header Banner -->
    <div class="relative rounded-3xl bg-gradient-to-r from-slate-950 via-warm-900 to-amber-950 text-white p-8 border-2 border-amber-500/40 shadow-2xl overflow-hidden">
      <div class="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider mb-3">
            <span>🔑</span> System Administration Control Panel
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight">Admin Dashboard</h1>
          <p class="text-xs sm:text-sm text-slate-300 mt-1">
            Logged in as <strong class="text-amber-300">admin@mail.com</strong> (Password: <code class="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-200">password</code>)
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <RouterLink
            to="/jackpot"
            class="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm hover:brightness-110 shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
          >
            <span>🎰</span> Spin Weekly Jackpot Wheel
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Platform Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="bg-white rounded-2xl p-5 border border-warm-200 shadow-sm space-y-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</div>
        <div class="text-2xl font-black text-slate-900">{{ stats.total_users }}</div>
        <div class="text-[10px] text-emerald-600 font-semibold">Registered Accounts</div>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-warm-200 shadow-sm space-y-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Listings</div>
        <div class="text-2xl font-black text-brand-600">{{ stats.total_listings }}</div>
        <div class="text-[10px] text-slate-500 font-semibold">Active Products</div>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-warm-200 shadow-sm space-y-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Companies</div>
        <div class="text-2xl font-black text-slate-900">{{ stats.total_companies }}</div>
        <div class="text-[10px] text-purple-600 font-semibold">Verified Businesses</div>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-warm-200 shadow-sm space-y-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rental Requests</div>
        <div class="text-2xl font-black text-amber-600">{{ stats.total_rentals }}</div>
        <div class="text-[10px] text-slate-500 font-semibold">Processed Deals</div>
      </div>

      <div class="bg-white rounded-2xl p-5 border border-warm-200 shadow-sm space-y-1 col-span-2 lg:col-span-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Volume</div>
        <div class="text-2xl font-black text-emerald-600">${{ Number(stats.total_volume || 0).toLocaleString() }}</div>
        <div class="text-[10px] text-emerald-600 font-semibold">Gross Rental Sales</div>
      </div>
    </div>

    <!-- Management Navigation Tabs -->
    <div class="bg-white rounded-2xl border border-warm-200 p-2 flex items-center gap-2">
      <button
        @click="activeTab = 'users'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
          activeTab === 'users' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
        ]"
      >
        <span>👥</span> Users ({{ users.length }})
      </button>

      <button
        @click="activeTab = 'listings'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
          activeTab === 'listings' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
        ]"
      >
        <span>📦</span> Product Listings ({{ listings.length }})
      </button>

      <button
        @click="activeTab = 'companies'"
        :class="[
          'flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2',
          activeTab === 'companies' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
        ]"
      >
        <span>🏢</span> Companies ({{ companies.length }})
      </button>
    </div>

    <!-- Tab 1: Users Management Table -->
    <div v-if="activeTab === 'users'" class="bg-white rounded-3xl border border-warm-200 shadow-xl overflow-hidden space-y-4 p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Registered Users</h3>
          <p class="text-xs text-slate-500">Manage user accounts, admin status, and permissions</p>
        </div>
        <input
          v-model="userSearch"
          type="text"
          placeholder="Search by name or email..."
          class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700">
          <thead class="bg-slate-50 border-y border-slate-100 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th class="p-3">User</th>
              <th class="p-3">Contact</th>
              <th class="p-3">Listings</th>
              <th class="p-3">Role</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="p-3 flex items-center gap-3">
                <img :src="user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'" class="w-8 h-8 rounded-full object-cover border" />
                <div>
                  <div class="font-bold text-slate-900">{{ user.name }}</div>
                  <div class="text-[10px] text-slate-400">ID: #{{ user.id }}</div>
                </div>
              </td>
              <td class="p-3 font-mono">
                <div>{{ user.email }}</div>
                <div class="text-[10px] text-slate-400">{{ user.phone || '--' }}</div>
              </td>
              <td class="p-3">
                <span class="px-2 py-1 bg-slate-100 rounded-lg font-bold text-slate-800">{{ user.listings_count || 0 }} items</span>
              </td>
              <td class="p-3">
                <span :class="['px-2.5 py-1 rounded-full text-[10px] font-black uppercase', user.is_admin === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600']">
                  {{ user.is_admin === 1 ? '🔑 ADMIN' : 'USER' }}
                </span>
              </td>
              <td class="p-3 text-right space-x-2">
                <button
                  @click="toggleUserAdmin(user)"
                  type="button"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px]"
                >
                  {{ user.is_admin === 1 ? 'Remove Admin' : 'Make Admin' }}
                </button>
                <button
                  @click="deleteUser(user)"
                  type="button"
                  class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[11px]"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Listings Management Table -->
    <div v-if="activeTab === 'listings'" class="bg-white rounded-3xl border border-warm-200 shadow-xl overflow-hidden space-y-4 p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900">All Marketplace Listings</h3>
          <p class="text-xs text-slate-500">Monitor and delete reported or invalid listings</p>
        </div>
        <input
          v-model="listingSearch"
          type="text"
          placeholder="Search listing title or owner..."
          class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700">
          <thead class="bg-slate-50 border-y border-slate-100 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th class="p-3">Product</th>
              <th class="p-3">Owner</th>
              <th class="p-3">Daily Rate</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in filteredListings" :key="item.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="p-3 flex items-center gap-3">
                <img :src="listingImageUrl(item.image_url)" class="w-10 h-10 rounded-xl object-cover border" />
                <div>
                  <RouterLink :to="`/listings/${item.id}`" class="font-bold text-slate-900 hover:text-brand-600">
                    {{ item.title }}
                  </RouterLink>
                  <div class="text-[10px] text-slate-400">{{ item.category_name || 'General' }}</div>
                </div>
              </td>
              <td class="p-3">
                <div class="font-semibold text-slate-800">{{ item.user_name || 'User #' + item.user_id }}</div>
                <div class="text-[10px] text-slate-400">{{ item.user_email }}</div>
              </td>
              <td class="p-3 font-bold text-emerald-600">
                ${{ item.daily_rate }}/day
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                  {{ item.status }}
                </span>
              </td>
              <td class="p-3 text-right">
                <button
                  @click="deleteListing(item)"
                  type="button"
                  class="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[11px]"
                >
                  Delete Listing
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: Companies Management Table -->
    <div v-if="activeTab === 'companies'" class="bg-white rounded-3xl border border-warm-200 shadow-xl overflow-hidden space-y-4 p-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Business & Companies Directory</h3>
          <p class="text-xs text-slate-500">Verify company profiles and monitor platform advertising</p>
        </div>
        <input
          v-model="companySearch"
          type="text"
          placeholder="Search company or owner..."
          class="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700">
          <thead class="bg-slate-50 border-y border-slate-100 text-slate-400 uppercase font-mono text-[10px]">
            <tr>
              <th class="p-3">Company</th>
              <th class="p-3">Owner</th>
              <th class="p-3">Verification</th>
              <th class="p-3">Listings</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="comp in filteredCompanies" :key="comp.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="p-3 flex items-center gap-3">
                <img :src="listingImageUrl(comp.logo)" class="w-10 h-10 rounded-xl object-cover border" />
                <div>
                  <RouterLink :to="`/company/${comp.slug || comp.id}`" class="font-bold text-slate-900 hover:text-brand-600">
                    {{ comp.name }}
                  </RouterLink>
                  <div class="text-[10px] text-slate-400">{{ comp.website || 'No website' }}</div>
                </div>
              </td>
              <td class="p-3">
                <div class="font-semibold text-slate-800">{{ comp.owner_name || 'Owner #' + comp.owner_id }}</div>
                <div class="text-[10px] text-slate-400">{{ comp.owner_email }}</div>
              </td>
              <td class="p-3">
                <span :class="['px-2.5 py-1 rounded-full text-[10px] font-black uppercase', comp.is_verified === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500']">
                  {{ comp.is_verified === 1 ? '✓ VERIFIED' : 'UNVERIFIED' }}
                </span>
              </td>
              <td class="p-3 font-bold text-slate-800">
                {{ comp.total_listings || 0 }} items
              </td>
              <td class="p-3 text-right space-x-2">
                <button
                  @click="toggleCompanyVerification(comp)"
                  type="button"
                  class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px]"
                >
                  {{ comp.is_verified === 1 ? 'Unverify' : 'Verify Badge' }}
                </button>
                <button
                  @click="deleteCompany(comp)"
                  type="button"
                  class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[11px]"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
