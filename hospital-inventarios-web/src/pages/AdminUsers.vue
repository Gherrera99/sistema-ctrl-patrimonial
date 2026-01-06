<!-- hospital-inventarios-web/src/pages/AdminUsers.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="h-11 w-11 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow">
            <!-- users icon -->
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M17 21a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 class="text-2xl font-semibold text-gray-900">Usuarios</h2>
            <p class="text-sm text-gray-500">
              Crea usuarios, asigna roles y restablece contraseñas.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="badge badge-gray">
            Total: <b class="ml-1">{{ users.length }}</b>
          </span>

          <button class="btn-secondary" type="button" @click="load" :disabled="loadingList">
            <span v-if="!loadingList">Actualizar</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
              </svg>
              Cargando...
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

      <!-- Create Card -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-semibold text-gray-900">Alta rápida</h3>
            <p class="text-xs text-gray-500">Crea un usuario y asigna su rol inicial.</p>
          </div>
          <span class="badge badge-green">Administración</span>
        </div>

        <form @submit.prevent="createUser" class="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div class="md:col-span-3">
            <label class="label">Nombre <span class="req">*</span></label>
            <input v-model.trim="f.name" placeholder="Nombre completo" class="input" :disabled="creating" />
          </div>

          <div class="md:col-span-4">
            <label class="label">Email <span class="req">*</span></label>
            <input v-model.trim="f.email" placeholder="usuario@correo.com" class="input" :disabled="creating" />
          </div>

          <div class="md:col-span-3">
            <label class="label">Rol</label>
            <select v-model="f.role" class="input" :disabled="creating">
              <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
                {{ r.label }}
              </option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="label">Contraseña <span class="req">*</span></label>
            <div class="relative">
              <input
                  v-model.trim="f.password"
                  :type="showCreatePass ? 'text' : 'password'"
                  placeholder="••••••••"
                  class="input pr-16"
                  :disabled="creating"
              />
              <button
                  type="button"
                  class="right-mini"
                  @click="showCreatePass = !showCreatePass"
                  :disabled="creating"
              >
                {{ showCreatePass ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </div>

          <div class="md:col-span-12 flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
            <button class="btn" type="submit" :disabled="creating">
              <span v-if="!creating">Crear usuario</span>
              <span v-else class="inline-flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
                </svg>
                Creando...
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Table Card -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900">Listado</h3>
            <p class="text-xs text-gray-500">Cambia rol al vuelo o edita datos desde el modal.</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="th">Nombre</th>
              <th class="th">Email</th>
              <th class="th">Rol</th>
              <th class="th text-right">Acciones</th>
            </tr>
            </thead>

            <tbody>
            <tr v-for="u in users" :key="u.id" class="border-t border-gray-100 hover:bg-gray-50/60">
              <td class="td">
                <div class="font-medium text-gray-900">{{ u.name }}</div>
                <div class="text-xs text-gray-500">ID: {{ u.id }}</div>
              </td>

              <td class="td">
                <div class="text-gray-900">{{ u.email }}</div>
              </td>

              <td class="td">
                <div class="flex items-center gap-2">
                  <span class="badge" :class="roleBadge(u.role)">{{ roleLabel(u.role) }}</span>

                  <select
                      class="input-sm"
                      v-model="u.role"
                      @change="saveRole(u)"
                      :disabled="savingId === u.id"
                      title="Cambiar rol"
                  >
                    <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
                      {{ r.label }}
                    </option>
                  </select>

                  <span v-if="savingId === u.id" class="text-xs text-gray-500">Guardando…</span>
                </div>
              </td>

              <td class="td">
                <div class="flex items-center justify-end gap-2">
                  <button class="btn-secondary-sm" type="button" @click="openEdit(u)">
                    Editar
                  </button>
                  <button class="btn-secondary-sm" type="button" @click="openReset(u)">
                    Reset pass
                  </button>
                  <button class="btn-danger-sm" type="button" @click="del(u)" :disabled="deletingId === u.id">
                    {{ deletingId === u.id ? 'Eliminando…' : 'Eliminar' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="!users.length && !loadingList">
              <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                Sin usuarios.
              </td>
            </tr>

            <tr v-if="loadingList">
              <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                Cargando usuarios…
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: Editar usuario -->
    <div v-if="editOpen" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4" @click.self="closeEdit">
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Editar usuario</h3>
            <p class="text-xs text-gray-500">Actualiza nombre, email y rol.</p>
          </div>
          <button class="btn-secondary-sm" type="button" @click="closeEdit">Cerrar</button>
        </div>

        <div v-if="editUser" class="mt-4 grid grid-cols-1 gap-3">
          <div>
            <label class="label">Nombre</label>
            <input class="input" v-model.trim="editForm.name" />
          </div>

          <div>
            <label class="label">Email</label>
            <input class="input" v-model.trim="editForm.email" />
          </div>

          <div>
            <label class="label">Rol</label>
            <select class="input" v-model="editForm.role">
              <option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">
                {{ r.label }}
              </option>
            </select>
          </div>

          <div class="pt-2 flex gap-2 justify-end">
            <button class="btn-secondary" type="button" @click="closeEdit" :disabled="savingEdit">
              Cancelar
            </button>
            <button class="btn" type="button" @click="saveEdit" :disabled="savingEdit">
              <span v-if="!savingEdit">Guardar cambios</span>
              <span v-else>Guardando…</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: Reset password -->
    <div v-if="resetOpen" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4" @click.self="closeReset">
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Restablecer contraseña</h3>
            <p class="text-xs text-gray-500">
              Usuario: <b>{{ resetUser?.email }}</b>
            </p>
          </div>
          <button class="btn-secondary-sm" type="button" @click="closeReset">Cerrar</button>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3">
          <div>
            <label class="label">Nueva contraseña</label>
            <div class="relative">
              <input
                  class="input pr-16"
                  v-model.trim="resetPassword"
                  :type="showResetPass ? 'text' : 'password'"
                  placeholder="••••••••"
              />
              <button type="button" class="right-mini" @click="showResetPass = !showResetPass">
                {{ showResetPass ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Tip: usa una contraseña temporal y pide al usuario cambiarla luego.
            </p>
          </div>

          <div class="pt-2 flex gap-2 justify-end">
            <button class="btn-secondary" type="button" @click="closeReset" :disabled="resetting">
              Cancelar
            </button>
            <button class="btn" type="button" @click="confirmReset" :disabled="resetting || !resetPassword.trim()">
              <span v-if="!resetting">Actualizar</span>
              <span v-else>Actualizando…</span>
            </button>
          </div>
        </div>
      </div>
    </div>

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
const loadingList = ref(false);

const error = ref('');
const success = ref('');
function clearMessages(){ error.value=''; success.value=''; }

const creating = ref(false);
const showCreatePass = ref(false);
const f = reactive({ name:'', email:'', password:'', role:'COLABORADOR' as Role });

const savingId = ref<number | null>(null);
const deletingId = ref<number | null>(null);

// --- Modales
const editOpen = ref(false);
const editUser = ref<User | null>(null);
const savingEdit = ref(false);
const editForm = reactive({ name:'', email:'', role:'COLABORADOR' as Role });

const resetOpen = ref(false);
const resetUser = ref<User | null>(null);
const resetPassword = ref('');
const resetting = ref(false);
const showResetPass = ref(false);

function roleLabel(r: Role){
  return ROLE_OPTIONS.find(x => x.value === r)?.label ?? r;
}

function roleBadge(r: Role){
  switch (r) {
    case 'ADMIN': return 'badge-amber';
    case 'CONTROL_PATRIMONIAL': return 'badge-blue';
    case 'AUXILIAR_PATRIMONIAL': return 'badge-indigo';
    case 'MANTENIMIENTO': return 'badge-gray';
    case 'TECNOLOGIAS': return 'badge-emerald';
    default: return 'badge-green';
  }
}

async function load(){
  clearMessages();
  loadingList.value = true;
  try {
    const { data } = await axios.get<User[]>(API);
    users.value = Array.isArray(data) ? data : [];
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'No se pudieron cargar los usuarios.';
  } finally {
    loadingList.value = false;
  }
}

async function createUser(){
  clearMessages();

  if (!f.name.trim() || !f.email.trim() || !f.password.trim()) {
    error.value = 'Completa nombre, email y contraseña.';
    return;
  }

  creating.value = true;
  try {
    await axios.post(API, { ...f, name: f.name.trim(), email: f.email.trim() });
    success.value = '✅ Usuario creado.';
    Object.assign(f, { name:'', email:'', password:'', role:'COLABORADOR' });
    await load();
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'No se pudo crear el usuario.';
  } finally {
    creating.value = false;
  }
}

async function saveRole(u: User){
  clearMessages();
  savingId.value = u.id;
  try {
    await axios.put(`${API}/${u.id}`, { name: u.name, email: u.email, role: u.role });
    success.value = '✅ Rol actualizado.';
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'No se pudo guardar.';
    await load(); // rollback visual
  } finally {
    savingId.value = null;
  }
}

function openEdit(u: User){
  clearMessages();
  editUser.value = u;
  editForm.name = u.name;
  editForm.email = u.email;
  editForm.role = u.role;
  editOpen.value = true;
}

function closeEdit(){
  editOpen.value = false;
  editUser.value = null;
}

async function saveEdit(){
  if (!editUser.value) return;
  clearMessages();

  if (!editForm.name.trim() || !editForm.email.trim()) {
    error.value = 'Nombre y email son obligatorios.';
    return;
  }

  savingEdit.value = true;
  try {
    await axios.put(`${API}/${editUser.value.id}`, {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
    });
    success.value = '✅ Usuario actualizado.';
    closeEdit();
    await load();
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'No se pudo actualizar.';
  } finally {
    savingEdit.value = false;
  }
}

function openReset(u: User){
  clearMessages();
  resetUser.value = u;
  resetPassword.value = '';
  showResetPass.value = false;
  resetOpen.value = true;
}

function closeReset(){
  resetOpen.value = false;
  resetUser.value = null;
  resetPassword.value = '';
}

async function confirmReset(){
  if (!resetUser.value) return;
  clearMessages();

  if (!resetPassword.value.trim()) {
    error.value = 'Ingresa la nueva contraseña.';
    return;
  }

  resetting.value = true;
  try {
    await axios.post(`${API}/${resetUser.value.id}/reset-password`, { newPassword: resetPassword.value.trim() });
    success.value = '✅ Contraseña actualizada.';
    closeReset();
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'No se pudo restablecer la contraseña.';
  } finally {
    resetting.value = false;
  }
}

async function del(u: User){
  clearMessages();
  if (!confirm(`Eliminar ${u.email}?`)) return;

  deletingId.value = u.id;
  try {
    await axios.delete(`${API}/${u.id}`);
    success.value = '✅ Usuario eliminado.';
    await load();
  } catch (e:any) {
    error.value = e?.response?.data?.error || 'No se pudo eliminar.';
  } finally {
    deletingId.value = null;
  }
}

onMounted(load);
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }
.req { @apply text-red-500; }

.input {
  @apply w-full border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white
  focus:ring-2 focus:ring-green-600/30 focus:border-green-600 placeholder:text-gray-400;
}

.input-sm {
  @apply border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white text-sm
  focus:ring-2 focus:ring-green-600/30 focus:border-green-600;
}

.btn {
  @apply bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium
  hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-secondary {
  @apply bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-secondary-sm {
  @apply bg-white text-gray-700 px-2.5 py-1.5 rounded-lg font-medium border border-gray-200 text-xs
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed;
}

.btn-danger-sm {
  @apply bg-red-600 text-white px-2.5 py-1.5 rounded-lg font-medium text-xs
  hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed;
}

.th { @apply text-left px-6 py-3 font-medium; }
.td { @apply px-6 py-3; }

.badge { @apply inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium; }
.badge-gray { @apply border-gray-200 bg-gray-50 text-gray-700; }
.badge-green { @apply border-green-200 bg-green-50 text-green-700; }
.badge-emerald { @apply border-emerald-200 bg-emerald-50 text-emerald-700; }
.badge-blue { @apply border-blue-200 bg-blue-50 text-blue-700; }
.badge-indigo { @apply border-indigo-200 bg-indigo-50 text-indigo-700; }
.badge-amber { @apply border-amber-200 bg-amber-50 text-amber-700; }

.right-mini {
  @apply absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs
  text-gray-600 hover:bg-gray-50;
}
</style>
