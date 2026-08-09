import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/Home.vue'), meta: { title: 'Home' } },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { title: 'Login' } },
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue'), meta: { title: 'Register' } },
  { path: '/listings', name: 'Listings', component: () => import('../views/Listings.vue'), meta: { title: 'Browse Listings' } },
  { path: '/map', name: 'MapView', component: () => import('../views/MapView.vue'), meta: { title: 'Neighborhood Rental Map' } },
  { path: '/listings/:id', name: 'ListingDetail', component: () => import('../views/ListingDetail.vue'), meta: { title: 'Listing Details' } },
  { path: '/create-listing', name: 'CreateListing', component: () => import('../views/CreateListing.vue'), meta: { requiresAuth: true, title: 'Create Listing' } },
  { path: '/messages', name: 'Messages', component: () => import('../views/Messages.vue'), meta: { requiresAuth: true, title: 'Messages' } },
  { path: '/notifications', name: 'Notifications', component: () => import('../views/Notifications.vue'), meta: { requiresAuth: true, title: 'Notifications' } },
  { path: '/messages/:userId', name: 'Conversation', component: () => import('../views/Messages.vue'), meta: { requiresAuth: true, title: 'Conversation' } },
  { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue'), meta: { requiresAuth: true, title: 'Profile' } },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue'), meta: { requiresAuth: true, title: 'Settings' } },
  { path: '/company/register', name: 'CompanyRegister', component: () => import('../views/CompanyRegister.vue'), meta: { requiresAuth: true, title: 'Register Company' } },
  { path: '/company/dashboard', name: 'CompanyDashboard', component: () => import('../views/CompanyDashboard.vue'), meta: { requiresAuth: true, title: 'Company Dashboard' } },
  { path: '/companies/:slug', name: 'CompanyProfile', component: () => import('../views/CompanyProfile.vue'), meta: { title: 'Company Profile' } },
  { path: '/categories/:slug', name: 'CategoryListings', component: () => import('../views/CategoryListings.vue'), meta: { title: 'Category' } },
  { path: '/products', name: 'Products', component: () => import('../views/Products.vue'), meta: { title: 'Browse Products' } },
  { path: '/products/:id', name: 'ProductDetail', component: () => import('../views/ProductDetail.vue'), meta: { title: 'Product Details' } },
  { path: '/create-product', name: 'CreateProduct', component: () => import('../views/CreateProduct.vue'), meta: { requiresAuth: true, title: 'Create Product' } },
  { path: '/my-products', name: 'MyProducts', component: () => import('../views/MyProducts.vue'), meta: { requiresAuth: true, title: 'My Products' } },
  { path: '/my-products/:id/edit', name: 'EditProduct', component: () => import('../views/EditProduct.vue'), meta: { requiresAuth: true, title: 'Edit Product' } },
  { path: '/my-listings', name: 'MyListings', component: () => import('../views/MyListings.vue'), meta: { requiresAuth: true, title: 'My Listings' } },
  { path: '/my-listings/:id/edit', name: 'EditListing', component: () => import('../views/EditListing.vue'), meta: { requiresAuth: true, title: 'Edit Listing' } },
  { path: '/my-rentals', name: 'MyRentals', component: () => import('../views/MyRentals.vue'), meta: { requiresAuth: true, title: 'My Rentals' } },
  { path: '/jackpot', name: 'Jackpot', component: () => import('../views/Jackpot.vue'), meta: { title: 'Weekly Jackpot Draw' } },
  { path: '/admin', name: 'AdminPanel', component: () => import('../views/AdminPanel.vue'), meta: { requiresAuth: true, title: 'Admin Control Panel' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const { isAuthenticated, authReady } = useAuthStore();
  await authReady;
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return '/login';
  }
});

export default router;
