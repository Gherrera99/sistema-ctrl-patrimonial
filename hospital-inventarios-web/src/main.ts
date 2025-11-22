// src/main.ts
import { createApp } from 'vue';
import { pinia } from './pinia';
import router from './router';
import App from './App.vue';
import './index.css';

import { useAuth } from './stores/auth';

router.beforeEach(async (to, _from, next) => {
    const auth = useAuth();
    if (!auth.ready) await auth.ensure();

    if (!auth.user && to.path !== '/login') return next('/login');
    if (auth.user && to.path === '/login') return next('/');

    // 🔐 páginas marcadas como admin en el router sólo las ve el "owner" en el FE
    if (to.meta?.admin) {
        const owner = import.meta.env.VITE_OWNER_EMAIL; // viene del build
        if (!auth.user || auth.user.email !== owner) {
            return next('/'); // o 404
        }
    }
    next();
});

createApp(App).use(pinia).use(router).mount('#app');
