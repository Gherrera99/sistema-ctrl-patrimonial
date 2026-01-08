import { defineStore } from 'pinia';
import axios from 'axios';

axios.defaults.withCredentials = true;
const API = '/api';

export type Role = 'ADMIN' | 'COLABORADOR';

export interface AuthUser {
    id: number | string;
    name: string;
    email: string;
    role: Role;
    permissions?: string[];
}

let interceptorsInstalled = false;
function installAxios401Interceptor() {
    if (interceptorsInstalled) return;
    interceptorsInstalled = true;

    axios.interceptors.response.use(
        (res) => res,
        async (err) => {
            if (err?.response?.status === 401) {
                try { await axios.post(`${API}/auth/logout`).catch(() => {}); } catch {}
                if (location.pathname !== '/login') location.href = '/login';
            }
            return Promise.reject(err);
        }
    );
}

export const useAuth = defineStore('auth', {
    state: () => ({
        user: null as AuthUser | null,
        ready: false,
    }),

    getters: {
        isAdmin: (state) => state.user?.role === 'ADMIN',
        can: (state) => (perm: string) => {
            if (state.user?.role === 'ADMIN' || state.user?.role === 'CONTROL_PATRIMONIAL' || state.user?.role === 'AUXILIAR_PATRIMONIAL' || state.user?.role === 'TECNOLOGIAS' || state.user?.role === 'MANTENIMIENTO') return true;
            return Array.isArray(state.user?.permissions) && state.user.permissions.includes(perm);
        },
    },

    actions: {
        normalizeUser(payload: any): AuthUser | null {
            if (!payload) return null;
            const u = payload.user ?? payload;
            const permissions = Array.isArray(u.permissions) ? u.permissions : undefined;
            return { ...u, permissions };
        },

        async ensure() {
            installAxios401Interceptor();
            if (this.ready) return this.user;

            try {
                const { data } = await axios.get(`${API}/auth/me`);
                this.user = this.normalizeUser(data);
            } catch {
                this.user = null;
            } finally {
                this.ready = true;
            }

            return this.user;
        },

        async login(email: string, password: string) {
            const { data } = await axios.post(`${API}/auth/login`, { email, password });

            // guarda lo que viene del login (id/name/email/role)
            this.user = this.normalizeUser(data);

            // 🔥 IMPORTANTE: fuerza a traer permissions desde /auth/me
            this.ready = false;
            await this.ensure();

            return this.user;
        },


        async logout() {
            installAxios401Interceptor();
            await axios.post(`${API}/auth/logout`).catch(() => {});
            this.user = null;
            this.ready = true;
        },
    },
});
