<!-- hospital-inventarios-web/src/pages/Personal.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8 px-4">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900">Catálogo de personal</h2>
          <p class="text-sm text-gray-500">Seleccionable para responsables de resguardo.</p>
        </div>

        <button class="btn" @click="openCreate">
          + Nuevo
        </button>
      </div>

      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100">
        <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input class="input" v-model.trim="q" placeholder="Buscar por nombre, RFC o puesto..." />
          <button class="btn-secondary" @click="fetchAll" :disabled="loading">
            {{ loading ? 'Cargando...' : 'Refrescar' }}
          </button>
        </div>

        <div class="p-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-gray-500">
            <tr>
              <th class="py-2">Nombre</th>
              <th class="py-2">RFC</th>
              <th class="py-2">Puesto</th>
              <th class="py-2 w-40">Acciones</th>
            </tr>
            </thead>
            <tbody>
            <tr v-if="filtered.length === 0">
              <td class="py-6 text-center text-gray-400" colspan="4">Sin registros</td>
            </tr>

            <tr v-for="p in filtered" :key="p.id" class="border-t border-gray-100">
              <td class="py-3">{{ p.nombre }}</td>
              <td class="py-3 font-mono">{{ p.rfc }}</td>
              <td class="py-3">{{ p.puesto }}</td>
              <td class="py-3">
                <div class="flex gap-2">
                  <button class="btn-secondary px-3 py-2" @click="openEdit(p)">Editar</button>
                  <button class="btn-danger px-3 py-2" @click="remove(p)" :disabled="loading">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <div v-if="modalOpen" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100">
          <div class="p-5 border-b border-gray-100">
            <div class="text-lg font-semibold text-gray-900">
              {{ editingId ? 'Editar personal' : 'Nuevo personal' }}
            </div>
            <div class="text-sm text-gray-500">Nombre, RFC y puesto.</div>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="label">Nombre <span class="req">*</span></label>
              <input class="input" v-model.trim="form.nombre" placeholder="Ej. Juan Pérez" />
            </div>
            <div>
              <label class="label">RFC <span class="req">*</span></label>
              <input class="input" v-model.trim="form.rfc" placeholder="Ej. HERR990126P1" />
            </div>
            <div>
              <label class="label">Puesto <span class="req">*</span></label>
              <input class="input" v-model.trim="form.puesto" placeholder="Ej. Jefe de Sistemas" />
            </div>
          </div>

          <div class="p-5 border-t border-gray-100 flex justify-end gap-2">
            <button class="btn-secondary" @click="closeModal" :disabled="loading">Cancelar</button>
            <button class="btn" @click="save" :disabled="loading">
              {{ loading ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import axios from 'axios';
axios.defaults.withCredentials = true;

type Personal = { id:number; nombre:string; rfc:string; puesto:string };

const API = '/api/personal';

const rows = ref<Personal[]>([]);
const loading = ref(false);
const q = ref('');

const modalOpen = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({ nombre: '', rfc: '', puesto: '' });

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase();
  if (!s) return rows.value;
  return rows.value.filter(p =>
      (p.nombre || '').toLowerCase().includes(s) ||
      (p.rfc || '').toLowerCase().includes(s) ||
      (p.puesto || '').toLowerCase().includes(s)
  );
});

async function fetchAll() {
  loading.value = true;
  try {
    const { data } = await axios.get<Personal[]>(API);
    rows.value = Array.isArray(data) ? data : [];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.nombre = ''; form.rfc = ''; form.puesto = '';
  modalOpen.value = true;
}

function openEdit(p: Personal) {
  editingId.value = p.id;
  form.nombre = p.nombre;
  form.rfc = p.rfc;
  form.puesto = p.puesto;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

async function save() {
  if (!form.nombre.trim() || !form.rfc.trim() || !form.puesto.trim()) {
    alert('Nombre, RFC y puesto son obligatorios');
    return;
  }
  loading.value = true;
  try {
    if (editingId.value) {
      await axios.put(`${API}/${editingId.value}`, { ...form });
    } else {
      await axios.post(API, { ...form });
    }
    modalOpen.value = false;
    await fetchAll();
  } catch (e: any) {
    alert(e?.response?.data?.error || 'No se pudo guardar');
  } finally {
    loading.value = false;
  }
}

async function remove(p: Personal) {
  if (!confirm(`¿Eliminar a "${p.nombre}"?`)) return;
  loading.value = true;
  try {
    await axios.delete(`${API}/${p.id}`);
    await fetchAll();
  } catch (e: any) {
    alert(e?.response?.data?.error || 'No se pudo eliminar');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAll);
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }
.req { @apply text-red-500; }
.input { @apply w-full border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 placeholder:text-gray-400; }
.btn { @apply bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2; }
.btn-secondary { @apply bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2; }
.btn-danger { @apply bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2; }
</style>
