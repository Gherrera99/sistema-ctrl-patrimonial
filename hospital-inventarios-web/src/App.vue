<!-- src/App.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <nav v-if="auth.ready && auth.user" class="bg-white border-b px-4 py-3 flex items-center justify-between">
      <h1 class="font-semibold">Inventarios Hospital</h1>
      <div class="space-x-3">
        <router-link class="link" to="/">Inventario</router-link>
        <router-link class="link" to="/ubicaciones">Ubicaciones</router-link>
        <router-link class="link" to="/autoridades">Autorizadores</router-link>
<!--        <router-link v-if="isOwner" class="link" to="/proveedores">Proveedores</router-link>-->
<!--        <router-link v-if="isOwner" class="link" to="/admin/usuarios">Usuarios</router-link>-->
        <router-link v-if="auth.can('proveedores:read')" class="link" to="/proveedores">Proveedores</router-link>
        <router-link v-if="auth.isAdmin" class="link" to="/admin/usuarios">Usuarios</router-link>
        <router-link v-if="auth.can('dictamen:read')" class="link" to="/dictamenes">Dictámenes</router-link>


        <button class="btn" @click="logout">Salir</button>
      </div>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from './stores/auth';

const auth = useAuth();
const logout = async () => { try { await auth.logout(); location.href = '/login'; } catch {} };
</script>


<style scoped>
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.link { @apply text-green-700 hover:underline; }
</style>
