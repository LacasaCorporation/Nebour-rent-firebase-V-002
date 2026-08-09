import { ref, computed } from 'vue';
import api from '../services/api';

function getInitialUser() {
  try {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

const user = ref(getInitialUser());
const token = ref(localStorage.getItem('token'));

let resolveAuthReady;
const authReady = new Promise((resolve) => { resolveAuthReady = resolve; });

async function fetchUser() {
  if (!token.value) {
    resolveAuthReady();
    return;
  }
  try {
    const res = await api.get('/user');
    user.value = res.data;
    localStorage.setItem('user', JSON.stringify(res.data));
  } catch (err) {
    if (err?.response?.status === 401) {
      logout();
    }
  } finally {
    resolveAuthReady();
  }
}

async function login(email, password) {
  const res = await api.post('/login', { email, password });
  token.value = res.data.token;
  user.value = res.data.user;
  localStorage.setItem('token', token.value);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data;
}

async function register(data) {
  const res = await api.post('/register', data);
  token.value = res.data.token;
  user.value = res.data.user;
  localStorage.setItem('token', token.value);
  localStorage.setItem('user', JSON.stringify(res.data.user));
  return res.data;
}

function logout() {
  token.value = null;
  user.value = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

if (token.value) {
  fetchUser();
} else {
  resolveAuthReady();
}

export function useAuthStore() {
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const currentUser = computed(() => user.value);

  return { user, token, isAuthenticated, currentUser, login, register, logout, fetchUser, authReady };
}
