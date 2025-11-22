<!-- src/pages/Login.vue -->
<template>
  <div class="max-w-sm mx-auto mt-24 bg-white p-6 rounded shadow">
    <h2 class="text-xl font-semibold mb-4">Iniciar sesión</h2>
    <form @submit.prevent="submit" class="space-y-3">
      <input v-model="email" placeholder="Usuario" class="input">
      <input v-model="password" type="password" placeholder="Contraseña" class="input">
      <button class="btn w-full">Entrar</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../stores/auth';
import { useRouter } from 'vue-router';

const r = useRouter();
const auth = useAuth();

const email = ref('');
const password = ref('');

const submit = async () => {
  try {
    await auth.login(email.value, password.value);
    r.push('/');
  } catch (e) {
    alert('Error de acceso');
    console.error(e);
  }
};
</script>

<style scoped>
.input { @apply border rounded px-3 py-2 w-full; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
</style>
