<!-- hospital-inventarios-web/src/pages/Proveedores.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
    <div class="max-w-6xl mx-auto">

      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900">Proveedores</h2>
          <p class="text-sm text-gray-500">
            Administra el catálogo de proveedores (contacto y datos fiscales).
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="badge badge-gray">
            Total: <b class="ml-1">{{ proveedores.length }}</b>
          </span>

          <button @click="nuevo" class="btn">
            <span class="inline-flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Nuevo proveedor
            </span>
          </button>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </div>
      <div v-if="success" class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        {{ success }}
      </div>

      <!-- Table Card -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b bg-white">
          <h3 class="font-semibold text-gray-900">Listado</h3>
          <p class="text-xs text-gray-500">Edita o elimina proveedores registrados.</p>
        </div>

        <div class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
            <tr class="text-gray-600">
              <th class="th min-w-[220px]">Nombre</th>
              <th class="th min-w-[140px]">RFC</th>
              <th class="th min-w-[140px]">Teléfono</th>
              <th class="th min-w-[220px]">Correo</th>
              <th class="th min-w-[260px]">Dirección</th>
              <th class="th text-right min-w-[140px]">Acciones</th>
            </tr>
            </thead>

            <tbody>
            <tr
                v-for="p in proveedores"
                :key="p.id"
                class="border-t hover:bg-gray-50/60"
            >
              <td class="td">
                <div class="font-medium text-gray-900">{{ p.nombre || '-' }}</div>
                <div class="text-xs text-gray-500" v-if="p.id">ID: {{ p.id }}</div>
              </td>

              <td class="td">
                <span class="badge badge-gray">{{ p.rfc || '-' }}</span>
              </td>

              <td class="td text-gray-700">{{ p.telefono || '-' }}</td>

              <td class="td">
                <a
                    v-if="p.correo"
                    class="text-green-700 hover:underline"
                    :href="`mailto:${p.correo}`"
                >
                  {{ p.correo }}
                </a>
                <span v-else class="text-gray-500">-</span>
              </td>

              <td class="td text-gray-700">
                <span class="line-clamp-2">{{ p.direccion || '-' }}</span>
              </td>

              <td class="td text-right">
                <div class="inline-flex gap-2">
                  <button class="btn-mini" @click="editar(p)">Editar</button>
                  <button class="btn-mini-danger" @click="eliminar(p)">Eliminar</button>
                </div>
              </td>
            </tr>

            <tr v-if="!proveedores.length">
              <td colspan="6" class="px-6 py-10 text-center text-gray-500">
                No hay proveedores registrados.
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <ProveedorModal
          :open="modalOpen"
          :proveedor="proveedorEdit"
          @close="modalOpen = false"
          @saved="cargar"
      />
    </div>
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

const error = ref("");
const success = ref("");

function clearMessages() {
  error.value = "";
  success.value = "";
}

async function cargar() {
  clearMessages();
  try {
    const { data } = await axios.get(`${API}/proveedores`);
    proveedores.value = Array.isArray(data) ? data : [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || "No se pudieron cargar los proveedores.";
  }
}

function nuevo() {
  clearMessages();
  proveedorEdit.value = null;
  modalOpen.value = true;
}

function editar(p: any) {
  clearMessages();
  proveedorEdit.value = p;
  modalOpen.value = true;
}

async function eliminar(p: any) {
  clearMessages();
  if (!confirm(`¿Eliminar proveedor "${p.nombre}"?`)) return;

  try {
    await axios.delete(`${API}/proveedores/${p.id}`);
    success.value = "✅ Proveedor eliminado.";
    await cargar();
  } catch (e: any) {
    error.value = e?.response?.data?.error || "No se pudo eliminar el proveedor.";
  }
}

onMounted(cargar);
</script>

<style scoped>
.badge { @apply inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium; }
.badge-gray { @apply border-gray-200 bg-gray-50 text-gray-700; }

.th { @apply text-left px-6 py-3 font-medium; }
.td { @apply px-6 py-3 align-top; }

.btn {
  @apply inline-flex items-center justify-center bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium
  hover:bg-green-700
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-mini {
  @apply inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium
  hover:bg-gray-50;
}

.btn-mini-danger {
  @apply inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700
  hover:bg-red-100;
}

/* util */
.line-clamp-2{
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
