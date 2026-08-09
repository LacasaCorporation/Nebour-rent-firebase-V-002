<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  company: {
    id?: number
    name: string
    slug: string
    description?: string
    address?: string
    phone?: string
    email?: string
    website?: string
    logo?: string
    total_listings?: number
    listings_count?: number
    listings?: any[]
    avg_rating?: number
  }
}>()

const copySuccess = ref(false)
const copyAdSuccess = ref(false)
const showQrModal = ref(false)
const showAdTextModal = ref(false)

const companyUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/companies/${props.company.slug}`
  }
  return `/companies/${props.company.slug}`
})

const encodedUrl = computed(() => encodeURIComponent(companyUrl.value))
const encodedName = computed(() => encodeURIComponent(props.company.name))

const listingCount = computed(() => {
  return props.company.total_listings ?? props.company.listings_count ?? props.company.listings?.length ?? 0
})

const defaultAdText = computed(() => {
  const nameStr = props.company.name
  const count = listingCount.value
  const desc = props.company.description || 'Explore our rental catalog of quality tools and equipment available locally.'
  const hashtag = nameStr.replace(/[^a-zA-Z0-9]/g, '')
  
  return `🚀 Discover ${nameStr} on Neighborhood Rental!\n\n${desc}\n\n📦 ${count} rental listing${count === 1 ? '' : 's'} available to book locally.\n👉 View & Rent Today: ${companyUrl.value}\n\n#RentLocal #NeighborhoodRental #${hashtag || 'RentalCompany'} #ToolRental`
})

const encodedDesc = computed(() => encodeURIComponent(props.company.description || `Check out ${props.company.name} on Neighborhood Rental!`))

const platforms = computed(() => [
  {
    name: 'Facebook',
    url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl.value}`,
    bgClass: 'bg-[#1877F2] hover:bg-[#166FE5] text-white',
    icon: 'facebook',
  },
  {
    name: 'X (Twitter)',
    url: `https://twitter.com/intent/tweet?url=${encodedUrl.value}&text=${encodeURIComponent(`Check out ${props.company.name}'s rental listings on Neighborhood Rental!`)}`,
    bgClass: 'bg-black hover:bg-neutral-800 text-white',
    icon: 'x',
  },
  {
    name: 'WhatsApp',
    url: `https://wa.me/?text=${encodeURIComponent(`Check out ${props.company.name} on Neighborhood Rental: `)}${encodedUrl.value}`,
    bgClass: 'bg-[#25D366] hover:bg-[#20BD5A] text-white',
    icon: 'whatsapp',
  },
  {
    name: 'LinkedIn',
    url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl.value}`,
    bgClass: 'bg-[#0A66C2] hover:bg-[#08529C] text-white',
    icon: 'linkedin',
  },
  {
    name: 'Telegram',
    url: `https://t.me/share/url?url=${encodedUrl.value}&text=${encodeURIComponent(`Discover ${props.company.name} rentals!`)}`,
    bgClass: 'bg-[#229ED9] hover:bg-[#1D88BC] text-white',
    icon: 'telegram',
  },
  {
    name: 'Pinterest',
    url: `https://pinterest.com/pin/create/button/?url=${encodedUrl.value}&description=${encodedDesc.value}`,
    bgClass: 'bg-[#E60023] hover:bg-[#CC001F] text-white',
    icon: 'pinterest',
  },
  {
    name: 'Email',
    url: `mailto:?subject=${encodeURIComponent(`Explore ${props.company.name} on Neighborhood Rental`)}&body=${encodeURIComponent(`Hi,\n\nI wanted to share ${props.company.name}'s public rental page with you:\n\n${companyUrl.value}\n\nCheck out their available listings!`)}`,
    bgClass: 'bg-warm-600 hover:bg-warm-700 text-white',
    icon: 'email',
  },
])

async function copyLink() {
  try {
    await navigator.clipboard.writeText(companyUrl.value)
    copySuccess.value = true
    setTimeout(() => (copySuccess.value = false), 2500)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = companyUrl.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copySuccess.value = true
    setTimeout(() => (copySuccess.value = false), 2500)
  }
}

async function copyAdText() {
  try {
    await navigator.clipboard.writeText(defaultAdText.value)
    copyAdSuccess.value = true
    setTimeout(() => (copyAdSuccess.value = false), 2500)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = defaultAdText.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copyAdSuccess.value = true
    setTimeout(() => (copyAdSuccess.value = false), 2500)
  }
}

const qrCodeUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl.value}&color=0f172a&bgcolor=ffffff`
})
</script>

<template>
  <!-- Top Social Media & Advertising Banner -->
  <div class="bg-gradient-to-r from-warm-900 via-slate-900 to-brand-950 text-white rounded-3xl p-6 shadow-xl border border-warm-700/50 relative overflow-hidden mb-8">
    <!-- Decorative background glow -->
    <div class="absolute -top-24 -right-24 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

    <div class="relative z-10 space-y-5">
      <!-- Top Header Row -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-400/30 mb-2 backdrop-blur-md">
            <span>📢</span> Public Social Media Advertising
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Advertise {{ company.name }} Publicly
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Share & promote this company’s rental listings on social media to reach more local renters in your area.
          </p>
        </div>

        <!-- Action Quick Buttons -->
        <div class="flex items-center flex-wrap gap-2.5">
          <button
            @click="copyLink"
            type="button"
            class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <svg v-if="!copySuccess" class="w-4 h-4 text-brand-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.386-2.238a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <svg v-else class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{{ copySuccess ? 'Link Copied!' : 'Copy Page Link' }}</span>
          </button>

          <button
            @click="showAdTextModal = true"
            type="button"
            class="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-600/30 transition-all flex items-center gap-2"
          >
            <span>✍️</span> Copy Ad Text
          </button>

          <button
            @click="showQrModal = true"
            type="button"
            class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all flex items-center gap-2 backdrop-blur-md"
          >
            <span>📱</span> Print/Scan QR
          </button>
        </div>
      </div>

      <!-- Social Media Buttons Grid -->
      <div class="pt-2 border-t border-white/10">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">1-Click Share to Platforms:</span>
        <div class="flex flex-wrap items-center gap-2">
          <a
            v-for="p in platforms"
            :key="p.name"
            :href="p.url"
            target="_blank"
            rel="noopener noreferrer"
            :class="[p.bgClass, 'px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-transform duration-150 hover:-translate-y-0.5 shadow-sm']"
            :title="`Advertise on ${p.name}`"
          >
            <svg v-if="p.icon === 'facebook'" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <svg v-else-if="p.icon === 'x'" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <svg v-else-if="p.icon === 'whatsapp'" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <svg v-else-if="p.icon === 'linkedin'" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <svg v-else-if="p.icon === 'telegram'" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            <svg v-else-if="p.icon === 'pinterest'" class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026l.032-.026z" />
            </svg>
            <svg v-else-if="p.icon === 'email'" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span>{{ p.name }}</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Ad Text Generator Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAdTextModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="showAdTextModal = false">
          <div class="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 text-slate-900 shadow-2xl relative">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center text-lg">
                  ✍️
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-900">Ready-to-Post Social Ad Caption</h3>
                  <p class="text-xs text-slate-500">Copy & paste into Instagram, Facebook Ads, or TikTok</p>
                </div>
              </div>
              <button @click="showAdTextModal = false" class="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <div class="space-y-3">
              <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Promotional Copy Snippet</label>
              <textarea
                :value="defaultAdText"
                readonly
                rows="7"
                class="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono focus:outline-none resize-none leading-relaxed"
              ></textarea>
            </div>

            <div class="flex items-center justify-between gap-3 pt-2">
              <span class="text-xs text-slate-400">Includes direct link & local hashtags</span>
              <button
                @click="copyAdText"
                type="button"
                class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span v-if="!copyAdSuccess">📋 Copy Caption</span>
                <span v-else class="text-emerald-200">✓ Copied to Clipboard!</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- QR Code Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showQrModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="showQrModal = false">
          <div class="bg-white rounded-3xl w-full max-w-sm p-6 space-y-5 text-slate-900 shadow-2xl text-center relative">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-base font-bold text-slate-900">Company QR Code</h3>
              <button @click="showQrModal = false" class="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            <p class="text-xs text-slate-500">Scan with any smartphone camera to immediately open this company page.</p>

            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block mx-auto shadow-inner">
              <img :src="qrCodeUrl" :alt="`${company.name} QR Code`" class="w-48 h-48 mx-auto" />
            </div>

            <div class="text-xs font-mono text-slate-500 truncate px-2 bg-slate-100 py-1.5 rounded-lg">
              {{ companyUrl }}
            </div>

            <div class="pt-2 flex justify-center">
              <a
                :href="qrCodeUrl"
                target="_blank"
                download="company-qr-code.png"
                class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-2"
              >
                ⬇️ Download High-Res QR Code
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
