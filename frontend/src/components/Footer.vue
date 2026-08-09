<template>
  <footer class="border-t border-warm-200 bg-white">
    <div class="max-w-6xl mx-auto px-6 py-10">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <h4 class="font-semibold text-warm-900 mb-2">Neighbour Renting</h4>
          <p class="text-sm text-warm-500 leading-relaxed">
            Rent from neighbours in your community. Safe, easy, and local.
          </p>
        </div>
        <div>
          <h4 class="font-semibold text-warm-900 mb-2">Quick Links</h4>
          <ul class="space-y-1.5 text-sm text-warm-500">
            <li><router-link to="/listings" class="hover:text-brand-500 transition-colors">Browse Listings</router-link></li>
            <li><router-link to="/company/dashboard" class="hover:text-brand-500 transition-colors">Companies</router-link></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-warm-900 mb-2">Support</h4>
          <ul class="space-y-1.5 text-sm text-warm-500">
            <li><router-link to="/settings" class="hover:text-brand-500 transition-colors">Settings</router-link></li>
            <li><a href="mailto:support@neighbourrenting.test" class="hover:text-brand-500 transition-colors">Contact</a></li>
          </ul>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-warm-100 text-center text-sm text-warm-400">
        &copy; {{ new Date().getFullYear() }} Neighbour Renting. All rights reserved.
      </div>
    </div>
  </footer>
</template>
