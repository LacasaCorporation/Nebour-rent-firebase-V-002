<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import GlobalHeaderBar from './components/GlobalHeaderBar.vue'
import ToastContainer from './components/ToastContainer.vue'
import Footer from './components/Footer.vue'

const route = useRoute()

watch(
  () => route.meta?.title,
  (title) => {
    document.title = title ? `${title} | Neighbour Renting` : 'Neighbour Renting'
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-warm-50 flex flex-col">
    <Navbar />
    <ToastContainer />

    <!-- Desktop: offset for sidebar -->
    <main class="hidden lg:flex flex-col ml-[80px] flex-1">
      <GlobalHeaderBar />
      <div class="flex-1">
        <router-view v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </div>
    </main>

    <!-- Mobile: offset for top bar -->
    <main class="lg:hidden pt-16 flex flex-col flex-1">
      <GlobalHeaderBar />
      <div class="flex-1">
        <router-view v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </div>
    </main>

    <Footer />
  </div>
</template>

