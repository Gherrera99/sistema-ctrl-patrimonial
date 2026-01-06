<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900">Ubicaciones</h2>
          <p class="text-sm text-gray-500">Administra el catálogo de ubicaciones disponibles para los bienes.</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="badge badge-gray">
            Total: <b class="ml-1">{{ ubicaciones.length }}</b>
          </span>
        </div>
      </div>

      <!-- Card: Form -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6 mb-5">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">
                {{ isEdit ? 'Editar ubicación' : 'Agregar ubicación' }}
              </h3>
              <p class="text-xs text-gray-500">
                Código corto + nombre legible. El orden controla cómo aparece en listas.
              </p>
            </div>
          </div>

          <span
              class="badge"
              :class="isEdit ? 'badge-amber' : 'badge-green'"
          >
            {{ isEdit ? 'Modo edición' : 'Registro nuevo' }}
          </span>
        </div>

        <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ error }}
        </div>
        <div v-if="success" class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {{ success }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="label">Código <span class="req">*</span></label>
            <input
                class="input"
                v-model.trim="form.code"
                placeholder="Ej. INF"
                maxlength="10"
                :disabled="loading"
            />
            <p class="help">Corto, sin espacios (ej. INF, URG, RX).</p>
          </div>

          <div class="md:col-span-1">
            <label class="label">Nombre <span class="req">*</span></label>
            <input
                class="input"
                v-model.trim="form.nombre"
                placeholder="Ej. Informática"
                maxlength="120"
                :disabled="loading"
            />
          </div>

          <div>
            <label class="label">Orden</label>
            <input
                class="input"
                v-model.number="form.orden"
                type="number"
                min="0"
                step="1"
                placeholder="99"
                :disabled="loading"
            />
            <p class="help">Menor orden = aparece primero.</p>
          </div>
        </div>

        <div class="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
              v-if="isEdit"
              type="button"
              class="btn-secondary"
              @click="cancelarEdicion"
              :disabled="loading"
          >
            Cancelar
          </button>

          <button class="btn" type="button" @click="guardar" :disabled="loading || !canSubmit">
            <span v-if="!loading">{{ isEdit ? 'Guardar cambios' : 'Agregar' }}</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
              </svg>
              Guardando...
            </span>
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b bg-white">
          <h3 class="font-semibold text-gray-900">Listado</h3>
          <p class="text-xs text-gray-500">Edita o elimina ubicaciones existentes.</p>
        </div>

        <div class="overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
            <tr class="text-gray-600">
              <th class="th">Código</th>
              <th class="th">Nombre</th>
              <th class="th">Orden</th>
              <th class="th text-right">Acciones</th>
            </tr>
            </thead>
            <tbody>
            <tr
                v-for="u in ubicaciones"
                :key="u.id"
                class="border-t hover:bg-gray-50/60"
            >
              <td class="td font-medium text-gray-900">{{ u.code }}</td>
              <td class="td text-gray-700">{{ u.nombre }}</td>
              <td class="td">
                <span class="badge badge-gray">{{ u.orden ?? '-' }}</span>
              </td>
              <td class="td text-right">
                <div class="inline-flex gap-2">
                  <button class="btn-mini" @click="editar(u)">Editar</button>
                  <button class="btn-mini-danger" @click="eliminar(u)">Eliminar</button>
                </div>
              </td>
            </tr>

            <tr v-if="!ubicaciones.length">
              <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                Sin ubicaciones registradas.
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import axios from 'axios';
axios.defaults.withCredentials = true;

const API = '/api';

type Ubicacion = { id: number; code: string; nombre: string; orden: number };

const ubicaciones = ref<Ubicacion[]>([]);
const loading = ref(false);
const error = ref('');
const success = ref('');

function clearMessages() {
  error.value = '';
  success.value = '';
}

const form = reactive<{ id?: number; code: string; nombre: string; orden: number }>({
  code: '',
  nombre: '',
  orden: 99,
});

const isEdit = computed(() => !!form.id);
const canSubmit = computed(() => !!form.code.trim() && !!form.nombre.trim());

async function cargar() {
  const { data } = await axios.get<Ubicacion[]>(`${API}/ubicaciones`);
  ubicaciones.value = Array.isArray(data) ? data : [];
}

function resetForm() {
  form.id = undefined;
  form.code = '';
  form.nombre = '';
  form.orden = 99;
}

function editar(u: Ubicacion) {
  clearMessages();
  form.id = u.id;
  form.code = u.code;
  form.nombre = u.nombre;
  form.orden = u.orden ?? 99;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
  clearMessages();
  resetForm();
}

async function guardar() {
  clearMessages();
  if (!canSubmit.value) {
    error.value = 'Código y nombre son obligatorios.';
    return;
  }

  const payload = {
    code: form.code.trim(),
    nombre: form.nombre.trim(),
    orden: Number.isFinite(form.orden) ? form.orden : 99,
  };

  loading.value = true;
  try {
    if (isEdit.value && form.id) {
      await axios.put(`${API}/ubicaciones/${form.id}`, payload);
      success.value = '✅ Ubicación actualizada.';
    } else {
      await axios.post(`${API}/ubicaciones`, payload);
      success.value = '✅ Ubicación creada.';
    }

    resetForm();
    await cargar();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo guardar la ubicación.';
  } finally {
    loading.value = false;
  }
}

async function eliminar(u: Ubicacion) {
  clearMessages();
  if (!confirm(`¿Eliminar "${u.nombre}"?`)) return;

  loading.value = true;
  try {
    await axios.delete(`${API}/ubicaciones/${u.id}`);
    success.value = '✅ Ubicación eliminada.';
    await cargar();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo eliminar.';
  } finally {
    loading.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }
.req { @apply text-red-500; }
.help { @apply mt-1 text-xs text-gray-500; }

.input {
  @apply w-full border border-gray-200 rounded-xl px-3 py-2 bg-white
  outline-none placeholder:text-gray-400
  focus:ring-2 focus:ring-green-600/30 focus:border-green-600;
}

.btn {
  @apply inline-flex items-center justify-center bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium
  hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-secondary {
  @apply inline-flex items-center justify-center bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.badge { @apply inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium; }
.badge-gray { @apply border-gray-200 bg-gray-50 text-gray-700; }
.badge-green { @apply border-green-200 bg-green-50 text-green-700; }
.badge-amber { @apply border-amber-200 bg-amber-50 text-amber-700; }

.th { @apply text-left px-6 py-3 font-medium; }
.td { @apply px-6 py-3; }

.btn-mini {
  @apply inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium
  hover:bg-gray-50;
}
.btn-mini-danger {
  @apply inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700
  hover:bg-red-100;
}
</style>
