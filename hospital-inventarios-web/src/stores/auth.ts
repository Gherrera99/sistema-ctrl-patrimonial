// src/stores/auth.ts
import { defineStore } from 'pinia';
import axios from 'axios';
import router from '../router';

axios.defaults.withCredentials = true;
const API = '/api';

let interceptorsInstalled = false;
function installAxios401Interceptor() {
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;

  axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        if (err?.response?.status === 401) {
          try { await axios.post(`${API}/auth/logout`).catch(()=>{}); } catch {}
          const { useAuth } = await import('./auth'); // evitar import circular
          const auth = useAuth();
          auth.user = null;
          auth.ready = true;
          if (router.currentRoute.value.path !== '/login') {
            router.replace('/login');
          }
        }
        return Promise.reject(err);
      }
  );
}

export const useAuth = defineStore('auth', {
  state: () => ({
    user: null as any,
    ready: false, // sabemos si ya intentamos /auth/me
  }),
  actions: {
    async ensure() {
      if (this.ready) return this.user;
      try {
        const { data } = await axios.get(`${API}/auth/me`);
        this.user = data;
      } catch {
        this.user = null;
      } finally {
        this.ready = true;
      }
      return this.user;
    },
    async login(email: string, password: string) {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      this.user = data.user;
      this.ready = true;
      return data.user;
    },
    async logout() {
      await axios.post(`${API}/auth/logout`).catch(()=>{});
      this.user = null;
      this.ready = true;
    },
  },
});

installAxios401Interceptor();
