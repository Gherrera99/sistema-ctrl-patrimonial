<template>
  <div class="max-w-5xl mx-auto p-4">
    <h2 class="text-xl font-semibold mb-4">Autorizadores</h2>

    <!-- Formulario de alta -->
    <div class="bg-white rounded shadow p-3 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input v-model.trim="f.fullName" class="input" placeholder="Nombre completo" />
        <input v-model.trim="f.title" class="input" placeholder="Cargo / Título" />
        <input v-model.trim="f.entity" class="input" placeholder="Entidad (p. ej. Hospital de la Amistad)" />
        <select v-model="f.groupCode" class="input">
          <option value="ADMINISTRATIVO">Administrativo</option>
          <option value="MEDICO">Médico</option>
        </select>
      </div>
      <div class="mt-3">
        <button class="btn" @click="add">Agregar</button>
      </div>
    </div>

    <!-- Listas -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="font-semibold mb-2">Administrativos</h3>
        <div v-if="administrativos.length === 0" class="text-gray-500 text-sm">Sin registros.</div>
        <div v-for="a in administrativos" :key="a.id" class="card">
          <div>
            <div class="font-medium">{{ a.fullName }}</div>
            <div class="text-xs text-gray-600">{{ a.title }} — {{ a.entity }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="tag" :class="a.active ? 'bg-green-600' : 'bg-gray-400'">
              {{ a.active ? 'Activo' : 'Inactivo' }}
            </span>
            <button class="btn-sm" @click="activate(a.id)">Activar</button>
            <button class="btn-danger-sm" @click="removeOne(a.id)">Eliminar</button>
          </div>
        </div>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Médicos</h3>
        <div v-if="medicos.length === 0" class="text-gray-500 text-sm">Sin registros.</div>
        <div v-for="a in medicos" :key="a.id" class="card">
          <div>
            <div class="font-medium">{{ a.fullName }}</div>
            <div class="text-xs text-gray-600">{{ a.title }} — {{ a.entity }}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="tag" :class="a.active ? 'bg-green-600' : 'bg-gray-400'">
              {{ a.active ? 'Activo' : 'Inactivo' }}
            </span>
            <button class="btn-sm" @click="activate(a.id)">Activar</button>
            <button class="btn-danger-sm" @click="removeOne(a.id)">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { reactive, ref, onMounted } from 'vue';
axios.defaults.withCredentials = true;

const API = '/api';

type Authorizer = {
  id: number;
  fullName: string;
  title: string;
  entity: string;
  active: boolean;
};

const administrativos = ref<Authorizer[]>([]);
const medicos = ref<Authorizer[]>([]);

const f = reactive({
  fullName: '',
  title: '',
  entity: '',
  groupCode: 'ADMINISTRATIVO',
});

async function load() {
  const { data } = await axios.get(`${API}/authorizers`);
  administrativos.value = data.administrativos ?? [];
  medicos.value = data.medicos ?? [];
}

async function add() {
  if (!f.fullName.trim() || !f.title.trim() || !f.entity.trim()) {
    alert('Nombre, cargo y entidad son obligatorios');
    return;
  }
  await axios.post(`${API}/authorizers`, {
    fullName: f.fullName.trim(),
    title: f.title.trim(),
    entity: f.entity.trim(),
    groupCode: f.groupCode,
  });
  f.fullName = ''; f.title = ''; f.entity = '';
  await load();
}

async function activate(id: number) {
  await axios.post(`${API}/authorizers/${id}/activate`);
  await load();
}

async function removeOne(id: number) {
  if (!confirm('¿Eliminar este autorizador?')) return;
  await axios.delete(`${API}/authorizers/${id}`);
  await load();
}

onMounted(load);
</script>

<style scoped>
.input { @apply border rounded px-3 py-2 w-full outline-none focus:ring-2 focus:ring-green-600/40; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.btn-sm { @apply bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs; }
.btn-danger-sm { @apply bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-xs; }
.card { @apply flex items-center justify-between bg-white border rounded p-3 mb-2; }
.tag { @apply text-white text-xs px-2 py-0.5 rounded; }
</style>
