<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900">Autorizadores</h2>
          <p class="text-sm text-gray-500">
            Administra las personas autorizadoras. Solo puede haber <b>1 activo</b> por grupo.
          </p>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </div>
      <div v-if="success" class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        {{ success }}
      </div>

      <!-- Form Card -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Nuevo autorizador</h3>
              <p class="text-xs text-gray-500">Nombre, cargo y entidad son obligatorios.</p>
            </div>
          </div>

          <span class="badge badge-gray text-xs">Catálogo</span>
        </div>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="md:col-span-2">
            <label class="label">Nombre completo <span class="req">*</span></label>
            <input v-model.trim="f.fullName" class="input" placeholder="Ej. Dra. María López" :disabled="loadingAdd" />
          </div>

          <div>
            <label class="label">Cargo / Título <span class="req">*</span></label>
            <input v-model.trim="f.title" class="input" placeholder="Ej. Director(a) Médico" :disabled="loadingAdd" />
          </div>

          <div>
            <label class="label">Grupo</label>
            <select v-model="f.groupCode" class="input" :disabled="loadingAdd">
              <option value="ADMINISTRATIVO">Administrativo</option>
              <option value="MEDICO">Médico</option>
            </select>
          </div>

          <div class="md:col-span-3">
            <label class="label">Entidad <span class="req">*</span></label>
            <input v-model.trim="f.entity" class="input" placeholder="Ej. Hospital de la Amistad" :disabled="loadingAdd" />
          </div>

          <div class="md:col-span-1 flex items-end">
            <button class="btn w-full" type="button" @click="add" :disabled="loadingAdd">
              <span v-if="!loadingAdd">Agregar</span>
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
      </div>

      <!-- Lists -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Administrativos -->
        <section class="bg-white/90 backdrop-blur rounded-2xl shadow border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">Administrativos</h3>
              <p class="text-xs text-gray-500">Gestiona el autorizador administrativo activo.</p>
            </div>
            <span class="badge badge-gray">{{ administrativos.length }}</span>
          </div>

          <div v-if="administrativos.length === 0" class="empty">
            Sin registros.
          </div>

          <div v-else class="space-y-2">
            <div v-for="a in administrativos" :key="a.id" class="row-card">
              <div class="min-w-0">
                <div class="font-medium text-gray-900 truncate">{{ a.fullName }}</div>
                <div class="text-xs text-gray-500 truncate">{{ a.title }} — {{ a.entity }}</div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="badge" :class="a.active ? 'badge-green' : 'badge-gray'">
                  {{ a.active ? 'Activo' : 'Inactivo' }}
                </span>

                <button
                    class="btn-sm"
                    type="button"
                    @click="activate(a.id)"
                    :disabled="loadingAct === a.id || a.active"
                    :title="a.active ? 'Ya está activo' : 'Activar'"
                >
                  {{ loadingAct === a.id ? '...' : 'Activar' }}
                </button>

                <button
                    class="btn-danger-sm"
                    type="button"
                    @click="removeOne(a.id)"
                    :disabled="loadingDel === a.id"
                    title="Eliminar"
                >
                  {{ loadingDel === a.id ? '...' : 'Eliminar' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Médicos -->
        <section class="bg-white/90 backdrop-blur rounded-2xl shadow border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">Médicos</h3>
              <p class="text-xs text-gray-500">Gestiona el autorizador médico activo.</p>
            </div>
            <span class="badge badge-gray">{{ medicos.length }}</span>
          </div>

          <div v-if="medicos.length === 0" class="empty">
            Sin registros.
          </div>

          <div v-else class="space-y-2">
            <div v-for="a in medicos" :key="a.id" class="row-card">
              <div class="min-w-0">
                <div class="font-medium text-gray-900 truncate">{{ a.fullName }}</div>
                <div class="text-xs text-gray-500 truncate">{{ a.title }} — {{ a.entity }}</div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="badge" :class="a.active ? 'badge-green' : 'badge-gray'">
                  {{ a.active ? 'Activo' : 'Inactivo' }}
                </span>

                <button
                    class="btn-sm"
                    type="button"
                    @click="activate(a.id)"
                    :disabled="loadingAct === a.id || a.active"
                    :title="a.active ? 'Ya está activo' : 'Activar'"
                >
                  {{ loadingAct === a.id ? '...' : 'Activar' }}
                </button>

                <button
                    class="btn-danger-sm"
                    type="button"
                    @click="removeOne(a.id)"
                    :disabled="loadingDel === a.id"
                    title="Eliminar"
                >
                  {{ loadingDel === a.id ? '...' : 'Eliminar' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <p class="mt-5 text-xs text-gray-400">
        Tip: “Activar” suele desactivar automáticamente al anterior (si tu backend lo maneja así).
      </p>
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

const loadingAdd = ref(false);
const loadingAct = ref<number | null>(null);
const loadingDel = ref<number | null>(null);

const error = ref('');
const success = ref('');
function clearMessages() { error.value = ''; success.value = ''; }

const f = reactive({
  fullName: '',
  title: '',
  entity: '',
  groupCode: 'ADMINISTRATIVO',
});

async function load() {
  clearMessages();
  try {
    const { data } = await axios.get(`${API}/authorizers`);
    administrativos.value = data.administrativos ?? [];
    medicos.value = data.medicos ?? [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cargar el catálogo.';
  }
}

async function add() {
  clearMessages();

  if (!f.fullName.trim() || !f.title.trim() || !f.entity.trim()) {
    error.value = 'Nombre, cargo y entidad son obligatorios.';
    return;
  }

  loadingAdd.value = true;
  try {
    await axios.post(`${API}/authorizers`, {
      fullName: f.fullName.trim(),
      title: f.title.trim(),
      entity: f.entity.trim(),
      groupCode: f.groupCode,
    });

    f.fullName = '';
    f.title = '';
    f.entity = '';

    success.value = '✅ Autorizador agregado.';
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo agregar.';
  } finally {
    loadingAdd.value = false;
  }
}

async function activate(id: number) {
  clearMessages();
  loadingAct.value = id;
  try {
    await axios.post(`${API}/authorizers/${id}/activate`);
    success.value = '✅ Autorizador activado.';
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo activar.';
  } finally {
    loadingAct.value = null;
  }
}

async function removeOne(id: number) {
  clearMessages();
  if (!confirm('¿Eliminar este autorizador?')) return;

  loadingDel.value = id;
  try {
    await axios.delete(`${API}/authorizers/${id}`);
    success.value = '✅ Autorizador eliminado.';
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo eliminar.';
  } finally {
    loadingDel.value = null;
  }
}

onMounted(load);
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }
.req { @apply text-red-500; }

.input {
  @apply w-full border border-gray-200 rounded-xl px-3 py-2
  outline-none bg-white
  focus:ring-2 focus:ring-green-600/30 focus:border-green-600
  placeholder:text-gray-400;
}

.btn {
  @apply bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium
  hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-sm {
  @apply bg-green-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium
  hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed;
}

.btn-danger-sm {
  @apply bg-red-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium
  hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed;
}

.badge { @apply inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium; }
.badge-gray { @apply border-gray-200 bg-gray-50 text-gray-700; }
.badge-green { @apply border-green-200 bg-green-50 text-green-700; }

.row-card {
  @apply flex items-center justify-between gap-3 bg-white border border-gray-100 rounded-xl p-3;
}

.empty {
  @apply text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-4 bg-white;
}
</style>
