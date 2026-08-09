import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 || status === 419) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const listingsAPI = {
  getAll(params) {
    return api.get('/listings', { params });
  },
  get(id) {
    return api.get(`/listings/${id}`);
  },
  show(id) {
    return api.get(`/listings/${id}`);
  },
  create(data) {
    if (data instanceof FormData) {
      return api.post('/listings', data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.post('/listings', data);
  },
  update(id, data) {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/listings/${id}`, data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.put(`/listings/${id}`, data);
  },
  delete(id) {
    return api.delete(`/listings/${id}`);
  },
  getMyListings(params) {
    return api.get('/my-listings', { params });
  },
  uploadImages(files) {
    const fd = new FormData();
    files.forEach((file) => fd.append('images[]', file));
    return api.post('/listings/upload-images', fd);
  },
  getPriceComparison(id) {
    return api.get(`/listings/${id}/price-comparison`);
  },
  compareListings(ids) {
    const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
    return api.get('/listings-compare', { params: { ids: idsStr } });
  },
};

export const productsAPI = {
  getAll(params) {
    return api.get('/products', { params });
  },
  get(id) {
    return api.get(`/products/${id}`);
  },
  show(id) {
    return api.get(`/products/${id}`);
  },
  create(data) {
    if (data instanceof FormData) {
      return api.post('/products', data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.post('/products', data);
  },
  update(id, data) {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/products/${id}`, data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.put(`/products/${id}`, data);
  },
  delete(id) {
    return api.delete(`/products/${id}`);
  },
  getMyProducts(params) {
    return api.get('/my-products', { params });
  },
};

export const authAPI = {
  login(data) {
    return api.post('/login', data);
  },
  register(data) {
    return api.post('/register', data);
  },
  logout() {
    return api.post('/logout');
  },
  getUser() {
    return api.get('/user');
  },
};

export const messagesAPI = {
  getConversations() {
    return api.get('/conversations');
  },
  getMessages(userId) {
    return api.get(`/messages/${userId}`);
  },
  sendMessage(data) {
    return api.post('/messages', data);
  },
};

export const companiesAPI = {
  getCompanies() {
    return api.get('/companies');
  },
  getAll() {
    return api.get('/companies');
  },
  all() {
    return api.get('/companies');
  },
  getMyCompanies() {
    return api.get('/my-companies');
  },
  myCompanies() {
    return api.get('/my-companies');
  },
  getCompany(slug) {
    return api.get(`/companies/${slug}`);
  },
  get(slug) {
    return api.get(`/companies/${slug}`);
  },
  registerCompany(data) {
    if (data instanceof FormData) {
      return api.post('/companies', data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.post('/companies', data);
  },
  create(data) {
    if (data instanceof FormData) {
      return api.post('/companies', data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.post('/companies', data);
  },
  updateCompany(slug, data) {
    if (data instanceof FormData) {
      return api.post(`/companies/${slug}`, data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.put(`/companies/${slug}`, data);
  },
  update(slug, data) {
    if (data instanceof FormData) {
      return api.post(`/companies/${slug}`, data, {
        headers: { 'Content-Type': undefined },
      });
    }
    return api.put(`/companies/${slug}`, data);
  },
  deleteCompany(slug) {
    return api.delete(`/companies/${slug}`);
  },
  delete(slug) {
    return api.delete(`/companies/${slug}`);
  },
  getCompanyListings(slug) {
    return api.get(`/companies/${slug}/listings`);
  },
  companyListings(slug) {
    return api.get(`/companies/${slug}/listings`);
  },
  attachListing(slug, listingId) {
    return api.post(`/companies/${slug}/attach-listing`, { listing_id: listingId });
  },
  detachListing(slug, listingId) {
    return api.delete(`/companies/${slug}/detach-listing/${listingId}`);
  },
  getCompanyAgreements(slug) {
    return api.get(`/companies/${slug}/agreements`);
  },
  companyAgreements(slug) {
    return api.get(`/companies/${slug}/agreements`);
  },
};

export const categoriesAPI = {
  getAll(params) {
    return api.get('/categories', { params });
  },
  getBySlug(slug) {
    return api.get(`/categories/${slug}`);
  },
  create(data) {
    return api.post('/categories', data);
  },
  update(id, data) {
    return api.put(`/categories/${id}`, data);
  },
  delete(id) {
    return api.delete(`/categories/${id}`);
  },
};

export const userAPI = {
  updateProfile(formData) {
    formData.append('_method', 'PUT');
    return api.post('/user', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword(data) {
    return api.put('/user/password', data);
  },
};

export const availabilityAPI = {
  get(listingId) {
    return api.get(`/listings/${listingId}/availability`);
  },
  update(listingId, data) {
    return api.put(`/listings/${listingId}/availability`, data);
  },
  blockDates(listingId, dates) {
    return api.post(`/listings/${listingId}/block-dates`, { dates });
  },
  unblockDate(listingId, date) {
    return api.delete(`/listings/${listingId}/unblock-date/${date}`);
  },
};

export { api };
export default api;

export const notificationsAPI = {
  getAll() {
    return api.get('/notifications');
  },
  markAsRead(id) {
    return api.put(`/notifications/${id}/read`);
  },
  markAllAsRead() {
    return api.put('/notifications/read-all');
  },
  unreadCount() {
    return api.get('/notifications/unread-count');
  },
};

export const favoritesAPI = {
  getAll() {
    return api.get('/favorites');
  },
  add(listingId) {
    return api.post('/favorites', { listing_id: listingId });
  },
  remove(listingId) {
    return api.delete(`/favorites/${listingId}`);
  },
};

export const savedSearchesAPI = {
  getAll() {
    return api.get('/saved-searches');
  },
  create(data) {
    return api.post('/saved-searches', data);
  },
  delete(id) {
    return api.delete(`/saved-searches/${id}`);
  },
};

export const reviewsAPI = {
  getMyReviews() {
    return api.get('/reviews/mine');
  },
  create(data) {
    return api.post('/reviews', data);
  },
};

export const rentalsAPI = {
  getMyRentals() {
    return api.get('/rentals/mine');
  },
  getMyLendings() {
    return api.get('/rentals/lendings');
  },
  accept(id) {
    return api.put(`/rental-requests/${id}/accept`);
  },
  reject(id) {
    return api.put(`/rental-requests/${id}/reject`);
  },
  cancel(id) {
    return api.put(`/rental-requests/${id}/cancel`);
  },
  start(id) {
    return api.put(`/rental-requests/${id}/start`);
  },
  complete(id) {
    return api.put(`/rental-requests/${id}/complete`);
  },
};
