<!-- hospital-inventarios-web/src/pages/AdminUsers.vue -->
<template>
  <div class="p-4 max-w-5xl mx-auto">
    <h2 class="text-xl font-semibold mb-4">Usuarios</h2>

    <!-- Alta rápida -->
    <form @submit.prevent="createUser" class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
      <input v-model.trim="f.name" placeholder="Nombre" class="input md:col-span-2" />
      <input v-model.trim="f.email" placeholder="Email" class="input md:col-span-2" />
      <select v-model="f.role" class="input">
        <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
          {{ r.label }}
        </option>
      </select>
      <input v-model.trim="f.password" placeholder="Contraseña" type="password" class="input md:col-span-2" />
      <button class="btn md:col-span-1">Crear</button>
    </form>

    <!-- Tabla -->
    <table class="w-full border text-sm">
      <thead class="bg-gray-100">
      <tr>
        <th class="th">Nombre</th>
        <th class="th">Email</th>
        <th class="th">Rol</th>
        <th class="th">Acciones</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="u in users" :key="u.id" class="border-t">
        <td class="td">{{ u.name }}</td>
        <td class="td">{{ u.email }}</td>
        <td class="td">
          <select class="input" v-model="u.role" @change="save(u)">
            <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
              {{ r.label }}
            </option>
          </select>
        </td>
        <td class="td space-x-2">
          <button class="text-green-700 hover:underline" @click="askReset(u)">Reset pass</button>
          <button class="text-red-700 hover:underline" @click="del(u)">Eliminar</button>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-if="!users.length" class="mt-4 text-gray-500">Sin usuarios.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import axios from 'axios';
axios.defaults.withCredentials = true;
const API = '/api/users';

type Role =
    | 'ADMIN'
    | 'COLABORADOR'
    | 'CONTROL_PATRIMONIAL'
    | 'AUXILIAR_PATRIMONIAL'
    | 'MANTENIMIENTO'
    | 'TECNOLOGIAS';

type User = { id:number; name:string; email:string; role: Role };

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'COLABORADOR', label: 'Colaborador' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CONTROL_PATRIMONIAL', label: 'Control patrimonial' },
  { value: 'AUXILIAR_PATRIMONIAL', label: 'Auxiliar patrimonial' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'TECNOLOGIAS', label: 'Tecnologías' },
];


const users = ref<User[]>([]);
const f = reactive({ name:'', email:'', password:'', role:'COLABORADOR' as Role });

async function load() {
  const { data } = await axios.get<User[]>(API);
  users.value = data;
}

async function createUser() {
  if (!f.name || !f.email || !f.password) return alert('Completa nombre, email y contraseña');
  await axios.post(API, f);
  Object.assign(f, { name:'', email:'', password:'', role:'COLABORADOR' });
  await load();
}

async function save(u: User) {
  await axios.put(`${API}/${u.id}`, { name: u.name, email: u.email, role: u.role });
}

async function askReset(u: User) {
  const pass = prompt(`Nueva contraseña para ${u.email}:`);
  if (!pass) return;
  await axios.post(`${API}/${u.id}/reset-password`, { newPassword: pass });
  alert('Contraseña actualizada');
}

async function del(u: User) {
  if (!confirm(`Eliminar ${u.email}?`)) return;
  await axios.delete(`${API}/${u.id}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.input { @apply border rounded px-2 py-1 w-full; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.th { @apply text-left p-2 border-b; }
.td { @apply p-2; }
</style>
