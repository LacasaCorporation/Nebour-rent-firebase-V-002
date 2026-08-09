import { ref, watch } from 'vue'
import { favoritesAPI } from '../services/api'
import { useAuthStore } from './auth'
import { useToast } from '../composables/useToast'

const favoritedIds = ref(new Set())
const loading = ref(false)
const initialized = ref(false)

export function useFavoritesStore() {
  const authStore = useAuthStore()
  const toast = useToast()

  async function fetchFavorites() {
    if (!authStore.isAuthenticated.value) {
      try {
        const local = localStorage.getItem('guest_wishlist')
        if (local) {
          const parsed = JSON.parse(local)
          favoritedIds.value = new Set(parsed.map(Number))
        } else {
          favoritedIds.value = new Set()
        }
      } catch {
        favoritedIds.value = new Set()
      }
      initialized.value = true
      return
    }

    loading.value = true
    try {
      const res = await favoritesAPI.getAll()
      const list = res.data?.data || res.data || []
      const ids = list.map((item) => Number(item?.listing?.id || item?.listing_id || item?.id))
      favoritedIds.value = new Set(ids.filter(Boolean))
      initialized.value = true
    } catch (e) {
      console.error('Failed to fetch favorites', e)
    } finally {
      loading.value = false
    }
  }

  function isFavorited(listingId) {
    return favoritedIds.value.has(Number(listingId))
  }

  async function toggleFavorite(listingId) {
    const id = Number(listingId)
    if (!id) return

    const wasFavorited = favoritedIds.value.has(id)

    // Optimistic update
    const newSet = new Set(favoritedIds.value)
    if (wasFavorited) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    favoritedIds.value = newSet

    if (!authStore.isAuthenticated.value) {
      localStorage.setItem('guest_wishlist', JSON.stringify(Array.from(newSet)))
      if (wasFavorited) {
        toast.info('Removed from saved wishlist')
      } else {
        toast.success('Saved to wishlist!')
      }
      return
    }

    try {
      if (wasFavorited) {
        await favoritesAPI.remove(id)
        toast.info('Removed from saved wishlist')
      } else {
        await favoritesAPI.add(id)
        toast.success('Saved to wishlist!')
      }
    } catch (e) {
      // Revert on error
      const revertSet = new Set(favoritedIds.value)
      if (wasFavorited) revertSet.add(id)
      else revertSet.delete(id)
      favoritedIds.value = revertSet
      toast.error('Failed to update wishlist')
    }
  }

  // Watch auth status changes
  watch(
    () => authStore.isAuthenticated.value,
    () => {
      fetchFavorites()
    },
    { immediate: true }
  )

  return {
    favoritedIds,
    isFavorited,
    toggleFavorite,
    fetchFavorites,
    loading
  }
}
