// src/router.ts
import { createRouter, createWebHistory } from 'vue-router';

import Login from './pages/Login.vue';
import Inventario from './pages/Inventario.vue';
import ItemForm from './pages/ItemForm.vue';
import Authorizers from './pages/Authorizers.vue';
import Ubicaciones from './pages/Ubicaciones.vue';
import Proveedores from './pages/Proveedores.vue';
import Dictamenes from "./pages/Dictamenes.vue";
import ImportInventario from "./pages/ImportInventario.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // públicas
        { path: '/login', component: Login, meta: { public: true } },

        // inventario (lista + modal)
        { path: '/', component: Inventario, meta: { requiresAuth: true } },
        { path: '/inventario/:id', component: Inventario, meta: { requiresAuth: true } }, // ✅ NUEVA
        { path: '/importar-inventario', component: ImportInventario, meta: { requiresAuth: true } },

        // forms legacy (si quieres mantenerlos)
        { path: '/nuevo', component: ItemForm, meta: { requiresAuth: true } },
        { path: '/editar/:id', component: ItemForm, meta: { requiresAuth: true } },

        { path: '/autoridades', component: Authorizers, meta: { requiresAuth: true } },
        { path: '/ubicaciones', component: Ubicaciones, meta: { requiresAuth: true } },

        { path: '/dictamenes', component: Dictamenes, meta: { requiresAuth: true, permission: 'dictamen:read' } },
        { path: '/dictamenes/:id', component: Dictamenes, meta: { requiresAuth: true, permission: 'dictamen:read' } },

        // admin
        {
            path: '/admin/usuarios',
            component: () => import('./pages/AdminUsers.vue'),
            meta: { requiresAuth: true, permission: 'usuarios:read' },
        },

        // catálogos
        {
            path: '/proveedores',
            component: Proveedores,
            meta: { requiresAuth: true, permission: 'proveedores:read' },
        },
    ],
});

// Guard global: auth + permisos
router.beforeEach(async (to) => {
    const { useAuth } = await import('./stores/auth');
    const auth = useAuth();

    // Asegura que auth esté listo (una sola vez hace /auth/me)
    if (!auth.ready) await auth.ensure();

    // Si la ruta es pública, deja pasar
    if ((to.meta as any)?.public) {
        if (to.path === '/login' && auth.user) return '/';
        return true;
    }

    // Para todo lo demás, exige sesión
    if (!auth.user) return '/login';

    // Permisos por ruta (si existe meta.permission)
    const perm = (to.meta as any)?.permission as string | undefined;
    if (perm && !auth.can(perm)) return '/';

    return true;
});

export default router;
