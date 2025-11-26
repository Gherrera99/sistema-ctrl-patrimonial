<!-- hospital-inventarios-web/src/pages/Proveedores.vue -->
<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Catálogo de Proveedores</h2>

    <div class="flex gap-2 mb-4">
      <button @click="nuevo" class="btn">Nuevo proveedor</button>
    </div>

    <table class="w-full bg-white rounded shadow text-sm">
      <thead class="bg-gray-100">
      <tr>
        <th class="th">Nombre</th>
        <th class="th">RFC</th>
        <th class="th">Teléfono</th>
        <th class="th">Correo</th>
        <th class="th">Dirección</th>
        <th class="th">Acciones</th>
      </tr>
      </thead>

      <tbody>
      <tr v-for="p in proveedores" :key="p.id" class="border-t">
        <td class="td">{{ p.nombre }}</td>
        <td class="td">{{ p.rfc }}</td>
        <td class="td">{{ p.telefono }}</td>
        <td class="td">{{ p.correo }}</td>
        <td class="td">{{ p.direccion }}</td>
        <td class="td space-x-2">
          <button class="text-green-700 hover:underline" @click="editar(p)">Editar</button>
          <button class="text-red-700 hover:underline" @click="eliminar(p)">Eliminar</button>
        </td>
      </tr>
      <tr v-if="!proveedores.length">
        <td colspan="6" class="td text-center text-gray-500">No hay proveedores</td>
      </tr>
      </tbody>
    </table>

    <ProveedorModal
        :open="modalOpen"
        :proveedor="proveedorEdit"
        @close="modalOpen = false"
        @saved="cargar"
    />
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { ref, onMounted } from "vue";
import ProveedorModal from "../components/ProveedorModal.vue";
axios.defaults.withCredentials = true;

const API = "/api";

const proveedores = ref<any[]>([]);
const modalOpen = ref(false);
const proveedorEdit = ref(null);

async function cargar() {
  const { data } = await axios.get(`${API}/proveedores`);
  proveedores.value = data;
}

function nuevo() {
  proveedorEdit.value = null;
  modalOpen.value = true;
}

function editar(p: any) {
  proveedorEdit.value = p;
  modalOpen.value = true;
}

async function eliminar(p: any) {
  if (!confirm(`¿Eliminar proveedor ${p.nombre}?`)) return;
  await axios.delete(`${API}/proveedores/${p.id}`);
  cargar();
}

onMounted(cargar);
</script>

<style scoped>
.th { @apply text-left p-2 border-b; }
.td { @apply p-2; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
</style>
