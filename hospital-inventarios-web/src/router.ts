// src/router.ts
import { createRouter, createWebHistory } from 'vue-router';
import Login from './pages/Login.vue';
import Inventario from './pages/Inventario.vue';
import ItemForm from './pages/ItemForm.vue';
import Authorizers from './pages/Authorizers.vue';
import Ubicaciones from './pages/Ubicaciones.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Inventario },
    { path: '/nuevo', component: ItemForm },
    { path: '/editar/:id', component: ItemForm },
    { path: '/autoridades', component: Authorizers },
    { path: '/ubicaciones', component: Ubicaciones },
    { path: '/admin/usuarios', component: () => import('../src/pages/AdminUsers.vue') },
  ],
});
