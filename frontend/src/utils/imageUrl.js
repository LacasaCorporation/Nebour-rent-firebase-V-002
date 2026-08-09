const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : ''

const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600'

export function listingImageUrl(path, fallback = DEFAULT_FALLBACK) {
  if (!path) return fallback
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const clean = path.startsWith('/') ? path : `/storage/${path}`
  return `${API_BASE}${clean}`
}

export function listingFirstImage(listingOrImages, fallback = DEFAULT_FALLBACK) {
  if (!listingOrImages) return fallback
  if (typeof listingOrImages === 'string') return listingImageUrl(listingOrImages, fallback)
  
  if (Array.isArray(listingOrImages)) {
    if (listingOrImages.length === 0) return fallback
    return listingImageUrl(listingOrImages[0], fallback)
  }
  
  if (typeof listingOrImages === 'object') {
    if (listingOrImages.image_url) return listingImageUrl(listingOrImages.image_url, fallback)
    if (Array.isArray(listingOrImages.images) && listingOrImages.images.length > 0) {
      return listingImageUrl(listingOrImages.images[0], fallback)
    }
  }
  return fallback
}

export function listingAllImages(listing) {
  if (!listing) return [DEFAULT_FALLBACK]
  const list = []
  if (listing.image_url) list.push(listingImageUrl(listing.image_url))
  if (Array.isArray(listing.images)) {
    listing.images.forEach(img => {
      if (img && !list.includes(img)) list.push(listingImageUrl(img))
    })
  }
  return list.length > 0 ? list : [DEFAULT_FALLBACK]
}

export function productImageUrl(path, fallback = DEFAULT_FALLBACK) {
  if (!path) return fallback
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const clean = path.startsWith('/') ? path : `/storage/${path}`
  return `${API_BASE}${clean}`
}

