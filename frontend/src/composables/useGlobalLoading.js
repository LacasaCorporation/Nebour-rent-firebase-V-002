import { ref, computed } from 'vue'

const activeRequests = ref(0)

export function useGlobalLoading() {
  const isGlobalLoading = computed(() => activeRequests.value > 0)

  function startRequest() {
    activeRequests.value++
  }

  function finishRequest() {
    if (activeRequests.value > 0) {
      activeRequests.value--
    }
  }

  return {
    activeRequests,
    isGlobalLoading,
    startRequest,
    finishRequest
  }
}
