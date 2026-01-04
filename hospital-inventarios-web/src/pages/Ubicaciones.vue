<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Catálogo de ubicaciones</h2>

    <div class="flex gap-2 mb-4">
      <input class="input w-28" v-model.trim="form.code" placeholder="Código (ej. INF)" />
      <input class="input w-72" v-model.trim="form.nombre" placeholder="Nombre (ej. Informática)" />
      <input class="input w-24" v-model.number="form.orden" type="number" placeholder="Orden" />
      <button class="btn" @click="agregar">Agregar</button>
    </div>

    <table class="w-full bg-white rounded shadow text-sm">
      <thead class="bg-gray-100">
      <tr>
        <th class="th">Código</th>
        <th class="th">Nombre</th>
        <th class="th">Orden</th>
        <th class="th">Acciones</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="u in ubicaciones" :key="u.id" class="border-t">
        <td class="td">{{ u.code }}</td>
        <td class="td">{{ u.nombre }}</td>
        <td class="td">{{ u.orden }}</td>
        <td class="td space-x-2">
          <button class="text-green-700 hover:underline" @click="editar(u)">Editar</button>
          <button class="text-red-700 hover:underline" @click="eliminar(u)">Eliminar</button>
        </td>
      </tr>
      <tr v-if="!ubicaciones.length">
        <td colspan="4" class="px-3 py-6 text-center text-gray-500">Sin ubicaciones</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import axios from 'axios';
axios.defaults.withCredentials = true;

const API = '/api';

type Ubicacion = { id: number; code: string; nombre: string; orden: number };

const ubicaciones = reactive<Ubicacion[]>([]);
const form = reactive<{ id?: number; code: string; nombre: string; orden: number }>({
  code: '',
  nombre: '',
  orden: 99,
});

async function cargar() {
  const { data } = await axios.get<Ubicacion[]>(`${API}/ubicaciones`);
  ubicaciones.splice(0, ubicaciones.length, ...(data || []));
}

async function agregar() {
  const payload = {
    code: form.code.trim(),
    nombre: form.nombre.trim(),   // 👈 aseguramos enviar 'nombre'
    orden: form.orden ?? 99,
  };
  if (!payload.code || !payload.nombre) {
    alert('Código y nombre son obligatorios');
    return;
  }
  await axios.post(`${API}/ubicaciones`, payload);
  form.code = '';
  form.nombre = '';
  form.orden = '';
  await cargar();
}

function editar(u: Ubicacion) {
  form.id = u.id;
  form.code = u.code;
  form.nombre = u.nombre;
  form.orden = u.orden ?? 99;
}

async function eliminar(u: Ubicacion) {
  if (!confirm(`¿Eliminar "${u.nombre}"?`)) return;
  await axios.delete(`${API}/ubicaciones/${u.id}`);
  await cargar();
}

onMounted(cargar);
</script>

<style scoped>
.input { @apply border rounded px-2 py-1; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.th { @apply text-left p-2 border-b; }
.td { @apply p-2; }
</style>
