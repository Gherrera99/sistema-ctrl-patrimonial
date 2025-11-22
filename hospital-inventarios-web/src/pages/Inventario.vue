<!-- hospital-inventarios-web/src/pages/Inventario.vue -->
<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Inventario del hospital</h2>

    <!-- Filtros -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <input v-model="filtros.nombre" placeholder="Buscar... (nombre, inventario, responsable)" class="input" />
      <input v-model="filtros.no_inventario" placeholder="No. inventario" class="input" />
      <input v-model="filtros.responsable" placeholder="Responsable" class="input" />

      <select v-model="filtros.ubicacionId" class="input">
        <option value="">Todas ubicaciones</option>
        <option v-for="u in ubicaciones" :key="u.id" :value="u.id">{{ u.nombre }}</option>
      </select>

      <select v-model="filtros.estadoId" class="input">
        <option value="">Todos estados</option>
        <option v-for="e in estados" :key="e.id" :value="e.id">{{ e.label }}</option>
      </select>

      <select v-model="filtros.tipo_bien" class="input">
        <option value="">Todos</option>
        <option value="ADMINISTRATIVO">Administrativo</option>
        <option value="MEDICO">Médico</option>
      </select>
    </div>

    <div class="flex gap-2 mb-4">
      <button @click="cargar" class="btn">Aplicar filtros</button>
      <router-link to="/nuevo" class="btn">Nuevo bien</router-link>
      <button @click="exportar" class="btn-secondary">Exportar a Excel</button>
    </div>

    <!-- Tabla -->
    <table class="w-full bg-white rounded shadow text-sm">
      <thead class="bg-gray-100">
      <tr>
        <th class="th">No. Inventario</th>
        <th class="th">Nombre</th>
        <th class="th">Responsable</th>
        <th class="th">Ubicación</th>
        <th class="th">Estado</th>
        <th class="th">Tipo</th>
        <th class="th">Fecha adj.</th>
        <th class="th">Acciones</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="it in items" :key="it.id" class="border-t">
        <td class="td">{{ it.no_inventario }}</td>
        <td class="td">{{ it.nombre }}</td>
        <td class="td">{{ it.responsable || '-' }}</td>
        <td class="td">{{ it.ubicacion?.nombre || '-' }}</td>
        <td class="td">{{ it.estado?.label || '-' }}</td>
        <!-- muestra aunque venga como 'tipo' o 'tipo_bien' -->
        <td class="td">{{ it.tipo ?? it.tipo_bien ?? '-' }}</td>
        <td class="td">{{ it.fecha_adjudicacion ? it.fecha_adjudicacion.slice(0, 10) : '' }}</td>
        <td class="td space-x-2">
          <router-link :to="`/editar/${it.id}`" class="text-green-700 hover:underline">Editar</router-link>
          <a :href="`/api/resguardo/${it.id}`" target="_blank" rel="noopener" class="text-green-700 hover:underline">
            Resguardo PDF
          </a>
          <button class="text-red-700 hover:underline" @click="eliminar(it)">Eliminar</button> <!-- 👈 nuevo -->
        </td>
      </tr>
      <tr v-if="!items.length">
        <td class="px-3 py-6 text-center text-gray-500" colspan="8">No hay registros.</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import axios from 'axios';
axios.defaults.withCredentials = true;

const API = '/api';

const items = ref<any[]>([]);
const ubicaciones = ref<any[]>([]);
const estados = ref<any[]>([]);

const filtros = reactive({
  nombre: '',
  no_inventario: '',
  responsable: '',
  ubicacionId: '',
  estadoId: '',
  // el backend puede esperar 'tipo' o 'tipo_bien'; enviamos ambos para compatibilidad
  tipo_bien: '',
});

async function cargar() {
  const params: any = { ...filtros };
  // por compatibilidad, si tu API filtra con 'tipo' también lo mandamos
  if (filtros.tipo_bien) params.tipo = filtros.tipo_bien;

  const { data } = await axios.get(API + '/inventario', { params });
  items.value = Array.isArray(data) ? data : [];
}

async function eliminar(it: any) {
  if (!confirm(`¿Eliminar el bien ${it.no_inventario} (${it.nombre})?`)) return;
  try {
    await axios.delete(`${API}/inventario/${it.id}`);
    await cargar(); // recargar la tabla
  } catch (e) {
    console.error(e);
    alert('No se pudo eliminar el bien.');
  }
}

async function exportar() {
  const params: any = { ...filtros };
  if (filtros.tipo_bien) params.tipo = filtros.tipo_bien;

  const { data } = await axios.get(API + '/inventario', { params });
  const rows = (Array.isArray(data) ? data : []).map((i: any) => ({
    'No. Inventario': i.no_inventario || '',
    'Nombre': i.nombre || '',
    'Responsable': i.responsable || '',
    'Ubicación': i.ubicacion?.nombre || '',
    'Estado': i.estado?.label || '',
    'Tipo': i.tipo ?? i.tipo_bien ?? '',
    'Fecha adj.': i.fecha_adjudicacion?.slice(0, 10) || '',
  }));

  const header = Object.keys(rows[0] || {}).join(',');
  const lines = rows.map((r: any) =>
      Object.values(r)
          .map((v: any) => String(v).replaceAll('"', '""'))
          .map((v: any) => (v.includes(',') ? `"${v}"` : v))
          .join(',')
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventario.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function cargarCatalogos() {
  const [u, e] = await Promise.all([
    axios.get(API + '/ubicaciones'),
    axios.get(API + '/estados-fisicos'),
  ]);
  ubicaciones.value = Array.isArray(u.data) ? u.data : [];
  estados.value = Array.isArray(e.data) ? e.data : [];
}

onMounted(async () => {
  await cargarCatalogos();
  await cargar();
});
</script>

<style scoped>
.input { @apply border rounded px-2 py-1 w-full; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.btn-secondary { @apply bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300; }
.th { @apply text-left p-2 border-b; }
.td { @apply p-2; }
</style>
