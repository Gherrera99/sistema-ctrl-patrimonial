<template>
  <div class="p-4 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-xl font-semibold">Dictámenes</h2>
        <p class="text-sm text-gray-500">Filtra por estado y abre cada dictamen en una ventana.</p>
      </div>

      <div class="flex gap-2">
        <router-link to="/" class="btn-secondary">Volver a inventario</router-link>

        <button class="btn" type="button" @click="openCreate">
          Nuevo dictamen
        </button>
      </div>
    </div>

    <!-- Avisos -->
    <div v-if="error" class="mb-4 p-3 rounded bg-red-50 text-red-700 border border-red-200">
      {{ error }}
    </div>
    <div v-if="success" class="mb-4 p-3 rounded bg-green-50 text-green-700 border border-green-200">
      {{ success }}
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded shadow p-4 mb-4">
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex gap-2">
          <button class="tab" :class="tabEstado==='BORRADOR' ? 'tab-on':''" @click="setEstado('BORRADOR')">Borrador</button>
          <button class="tab" :class="tabEstado==='FIRMADO' ? 'tab-on':''" @click="setEstado('FIRMADO')">Firmado</button>
          <button class="tab" :class="tabEstado==='CANCELADO' ? 'tab-on':''" @click="setEstado('CANCELADO')">Cancelado</button>
        </div>

        <div class="flex gap-2 flex-1">
          <input
              class="input flex-1"
              v-model.trim="listQ"
              placeholder="Buscar por folio / inventario / nombre..."
              @keydown.enter="cargarListado"
          />
          <button class="btn-secondary" @click="cargarListado" :disabled="loadingList">
            {{ loadingList ? '...' : 'Buscar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Listado -->
    <div class="bg-white rounded shadow p-2">
      <div class="px-3 py-2 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Mostrando: <span class="font-medium">{{ tabEstado }}</span>
          <span class="text-gray-400">·</span>
          Total: <span class="font-medium">{{ list.length }}</span>
        </div>

        <button class="btn-secondary" @click="cargarListado" :disabled="loadingList">
          Recargar
        </button>
      </div>

      <div class="border-t">
        <div v-if="loadingList" class="p-4 text-sm text-gray-500">Cargando...</div>

        <div v-else-if="!list.length" class="p-4 text-sm text-gray-500">
          No hay dictámenes en este estado.
        </div>

        <div v-else class="max-h-[70vh] overflow-auto">
          <button
              v-for="d in list"
              :key="d.id"
              class="w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50"
              @click="openDetail(d.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium">
                  #{{ d.id }} — {{ d.bien?.no_inventario }} · {{ d.bien?.nombre }}
                </div>

                <div class="text-sm text-gray-600 mt-1">
                  Fecha: {{ d.fecha ? String(d.fecha).slice(0,10) : '-' }}
                  <span class="text-gray-400">·</span>
                  Creador: {{ d.creadoPor?.name || '-' }}
                  <span class="text-gray-400">·</span>
                  Escaneado: <span class="font-medium">{{ hasScan(d) ? 'Sí' : 'No' }}</span>
                </div>
              </div>

              <span class="badge" :class="badgeClass(d.estado)">
                {{ d.estado }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================= -->
    <!-- MODAL: DETALLE DICTAMEN    -->
    <!-- ========================= -->
    <div v-if="showDetail" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="text-sm text-gray-500">Dictamen</div>
            <div class="text-lg font-semibold">
              #{{ dictamen?.id }} — {{ dictamen?.bien?.no_inventario }} · {{ dictamen?.bien?.nombre }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a
                v-if="dictamen?.id"
                class="btn-secondary"
                :href="`${API}/dictamen/${dictamen.id}/pdf`"
                target="_blank"
                rel="noopener"
            >
              Ver PDF (plantilla)
            </a>

            <button class="btn-secondary" @click="closeDetail">Cerrar</button>
          </div>
        </div>

        <div class="modal-body" v-if="loadingDetail">
          <div class="p-4 text-sm text-gray-500">Cargando dictamen...</div>
        </div>

        <div class="modal-body" v-else>
          <!-- Resumen -->
          <div class="grid md:grid-cols-3 gap-3 mb-4">
            <div class="card">
              <div class="text-xs text-gray-500">Estado</div>
              <div class="font-medium flex items-center gap-2">
                <span class="badge" :class="badgeClass(dictamen?.estado)">{{ dictamen?.estado }}</span>
                <span v-if="!canEdit" class="text-xs text-gray-500">(Solo lectura)</span>
              </div>
            </div>

            <div class="card">
              <div class="text-xs text-gray-500">Fecha</div>
              <div class="font-medium">{{ dictamen?.fecha ? String(dictamen.fecha).slice(0,10) : '-' }}</div>
            </div>

            <div class="card">
              <div class="text-xs text-gray-500">Escaneado</div>
              <div class="font-medium">{{ hasScan(dictamen) ? 'Cargado' : 'No cargado' }}</div>
            </div>
          </div>

          <!-- Vista / Edición -->
          <div class="grid md:grid-cols-2 gap-3">
            <div class="card">
              <div class="text-xs text-gray-500">Unidad de adscripción</div>
              <div class="font-medium">{{ dictamen?.unidadAdscripcion || 'Hospital de la Amistad' }}</div>
            </div>

            <div class="card">
              <div class="text-xs text-gray-500">Ubicación física</div>
              <div v-if="!editMode" class="font-medium">{{ dictamen?.ubicacionFisica || '-' }}</div>
              <input v-else class="input mt-2" v-model.trim="f.ubicacionFisica" />
            </div>

            <div class="card md:col-span-2">
              <div class="text-xs text-gray-500">Dictamen (texto)</div>
              <pre v-if="!editMode" class="mt-2 whitespace-pre-wrap text-sm text-gray-800">{{ dictamen?.dictamenTexto || '-' }}</pre>
              <textarea v-else class="input min-h-[180px] mt-2" v-model.trim="f.dictamenTexto" />
            </div>
          </div>

          <!-- Escaneado -->
          <div class="card mt-4">
            <div class="font-semibold text-sm mb-2">Dictamen escaneado</div>

            <div class="flex flex-col md:flex-row md:items-center gap-2">
              <input
                  type="file"
                  @change="onFile"
                  accept=".pdf,image/*"
                  class="file-input flex-1"
              />

              <button
                  class="btn-secondary shrink-0"
                  type="button"
                  @click="subirEscaneado"
                  :disabled="!file || loadingUpload || (!canUpload && !isAdmin)"
              >
                {{ loadingUpload ? 'Subiendo...' : 'Subir' }}
              </button>
            </div>

            <div class="mt-2 text-sm">
              Estado: <span class="font-medium">{{ hasScan(dictamen) ? 'Cargado' : 'No cargado' }}</span>
            </div>

            <div v-if="scanFile(dictamen)" class="mt-2">
              <a class="text-green-700 hover:underline" :href="scanFile(dictamen).filePath" target="_blank" rel="noopener">
                Ver escaneado: {{ scanFile(dictamen).nombre }}
              </a>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex flex-wrap gap-2 mt-4">
            <!-- Editar toggle -->
            <button v-if="canEdit && !editMode" class="btn" @click="enableEdit" type="button">
              Editar
            </button>

            <button v-if="editMode" class="btn" @click="guardar" :disabled="loadingSave" type="button">
              {{ loadingSave ? 'Guardando...' : 'Guardar cambios' }}
            </button>

            <button v-if="editMode" class="btn-secondary" @click="cancelEdit" type="button">
              Cancelar edición
            </button>

            <!-- Firmar -->
            <button
                v-if="dictamen?.id && dictamen.estado === 'BORRADOR'"
                class="btn-secondary"
                type="button"
                :disabled="loadingSign || !hasScan(dictamen)"
                @click="firmar"
                title="Necesitas escaneado para firmar"
            >
              {{ loadingSign ? 'Firmando...' : 'Firmar dictamen' }}
            </button>

            <!-- Cancelar -->
            <button
                v-if="dictamen?.id && isAdmin && dictamen.estado !== 'CANCELADO'"
                class="btn-secondary"
                type="button"
                :disabled="loadingCancel"
                @click="cancelar"
            >
              {{ loadingCancel ? 'Cancelando...' : 'Cancelar (ADMIN)' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================= -->
    <!-- MODAL: NUEVO DICTAMEN      -->
    <!-- ========================= -->
    <div v-if="showCreate" class="modal-backdrop" @click.self="closeCreate">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="text-sm text-gray-500">Nuevo</div>
            <div class="text-lg font-semibold">Crear dictamen</div>
          </div>
          <button class="btn-secondary" @click="closeCreate">Cerrar</button>
        </div>

        <div class="modal-body">
          <!-- Buscar bien -->
          <div class="card mb-3">
            <div class="font-semibold text-sm mb-2">1) Buscar bien</div>

            <div class="flex gap-2">
              <input
                  class="input flex-1"
                  v-model.trim="q"
                  placeholder="Buscar por inventario, nombre o serie..."
                  @keydown.enter="buscar"
              />
              <button class="btn-secondary" @click="buscar" :disabled="loadingSearch">
                {{ loadingSearch ? '...' : 'Buscar' }}
              </button>
            </div>

            <!-- ✅ FIX: lista con altura máxima + scroll interno -->
            <div v-if="hits.length" class="mt-3 border rounded overflow-y-auto max-h-64">
              <button
                  v-for="b in hits"
                  :key="b.id"
                  class="w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50"
                  :class="selectedBien?.id === b.id ? 'bg-green-50' : ''"
                  @click="selectBien(b)"
              >
                <div class="font-medium">{{ b.no_inventario }} — {{ b.nombre }}</div>
                <div class="text-sm text-gray-600">
                  Serie: {{ b.no_serie || '-' }} · {{ b.marca || '-' }} {{ b.modelo || '' }}
                </div>
                <div class="text-xs text-gray-500">
                  Ubic: {{ b.ubicacion?.nombre || '-' }} · Estado: {{ b.estado?.label || '-' }}
                </div>
              </button>
            </div>

            <div v-else class="text-sm text-gray-500 mt-3">
              Escribe algo y presiona “Buscar”.
            </div>

            <div v-if="selectedBien" class="mt-3 p-3 rounded border bg-gray-50">
              <div class="font-semibold text-sm">Bien seleccionado</div>
              <div class="text-sm">
                {{ selectedBien.no_inventario }} — {{ selectedBien.nombre }}
              </div>
            </div>
          </div>

          <!-- Form -->
          <div class="card">
            <div class="font-semibold text-sm mb-2">2) Capturar dictamen</div>

            <div v-if="!selectedBien" class="text-sm text-gray-500">
              Selecciona un bien para continuar.
            </div>

            <div v-else class="grid gap-3">
              <div>
                <label class="label">Fecha</label>
                <input class="input" type="date" v-model="f.fecha" />
              </div>

              <div>
                <label class="label">Unidad de adscripción</label>
                <input class="input" v-model.trim="f.unidadAdscripcion" disabled />
              </div>

              <div>
                <label class="label">Ubicación física</label>
                <input class="input" v-model.trim="f.ubicacionFisica" />
              </div>

              <div>
                <label class="label">Dictamen (texto)</label>
                <textarea class="input min-h-[180px]" v-model.trim="f.dictamenTexto" />
              </div>

              <div class="flex gap-2">
                <button class="btn" @click="guardar" :disabled="loadingSave">
                  {{ loadingSave ? 'Creando...' : 'Crear dictamen' }}
                </button>
                <button class="btn-secondary" @click="closeCreate" type="button">Cancelar</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

axios.defaults.withCredentials = true;

const API = '/api';
const route = useRoute();
const router = useRouter();

const error = ref('');
const success = ref('');

function clearMessages() { error.value = ''; success.value = ''; }

// listado
const list = ref<any[]>([]);
const tabEstado = ref<'BORRADOR'|'FIRMADO'|'CANCELADO'>('BORRADOR');
const listQ = ref('');
const loadingList = ref(false);

// user
const myRole = ref<string>('');
const isAdmin = computed(() => myRole.value === 'ADMIN');

// modals
const showDetail = ref(false);
const showCreate = ref(false);
const editMode = ref(false);
const loadingDetail = ref(false);

// dictamen actual
const dictamen = ref<any | null>(null);

// crear/buscar bien
const q = ref('');
const hits = ref<any[]>([]);
const selectedBien = ref<any | null>(null);
const loadingSearch = ref(false);

// form
const f = reactive({
  fecha: new Date().toISOString().slice(0, 10),
  unidadAdscripcion: 'Hospital de la Amistad',
  ubicacionFisica: '',
  dictamenTexto: '',
});

// loaders acciones
const loadingSave = ref(false);
const loadingSign = ref(false);
const loadingUpload = ref(false);
const loadingCancel = ref(false);

// upload
const file = ref<File | null>(null);

function badgeClass(estado?: string) {
  const e = String(estado || '').toUpperCase();
  if (e === 'BORRADOR') return 'badge-yellow';
  if (e === 'FIRMADO') return 'badge-green';
  if (e === 'CANCELADO') return 'badge-red';
  return 'badge-gray';
}

function hasScan(d: any) {
  const arr = d?.DictamenArchivo || [];
  return arr.some((a: any) => ['PDF','FOTO'].includes(String(a.tipo).toUpperCase()));
}

function scanFile(d: any) {
  const arr = d?.DictamenArchivo || [];
  return arr.find((a: any) => ['PDF','FOTO'].includes(String(a.tipo).toUpperCase())) || null;
}

const canEdit = computed(() => {
  if (!dictamen.value?.id) return true;
  if (dictamen.value?.estado === 'BORRADOR') return true;
  return isAdmin.value;
});

const canUpload = computed(() => {
  if (!dictamen.value?.id) return false;
  if (dictamen.value?.estado === 'BORRADOR') return true;
  return isAdmin.value;
});

function fillFormFromDictamen(d: any) {
  f.fecha = d?.fecha ? String(d.fecha).slice(0,10) : new Date().toISOString().slice(0, 10);
  f.unidadAdscripcion = d?.unidadAdscripcion || 'Hospital de la Amistad';
  f.ubicacionFisica = d?.ubicacionFisica ?? '';
  f.dictamenTexto = d?.dictamenTexto ?? '';
}

async function loadMe() {
  const candidates = [`${API}/auth/me`, `${API}/users/me`, `${API}/me`];
  for (const url of candidates) {
    try {
      const { data } = await axios.get(url);
      if (data?.role) { myRole.value = String(data.role); return; }
    } catch {}
  }
  myRole.value = '';
}

async function cargarListado() {
  clearMessages();
  loadingList.value = true;
  try {
    const { data } = await axios.get(`${API}/dictamen`, {
      params: { estado: tabEstado.value, q: listQ.value.trim() || undefined },
    });
    list.value = Array.isArray(data) ? data : [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cargar el listado.';
  } finally {
    loadingList.value = false;
  }
}

function setEstado(s: 'BORRADOR'|'FIRMADO'|'CANCELADO') {
  tabEstado.value = s;
  cargarListado();
}

async function cargarDictamen(id: number) {
  loadingDetail.value = true;
  try {
    const { data } = await axios.get(`${API}/dictamen/${id}`);
    dictamen.value = data;
    fillFormFromDictamen(data);
  } finally {
    loadingDetail.value = false;
  }
}

async function openDetail(id: number) {
  clearMessages();
  showDetail.value = true;
  editMode.value = false;
  file.value = null;
  await cargarDictamen(id);
  router.replace(`/dictamenes/${id}`);
}

function closeDetail() {
  showDetail.value = false;
  editMode.value = false;
  file.value = null;
  router.replace('/dictamenes');
}

function enableEdit() {
  if (!canEdit.value) return;
  editMode.value = true;
}

function cancelEdit() {
  editMode.value = false;
  if (dictamen.value) fillFormFromDictamen(dictamen.value);
}

function openCreate() {
  clearMessages();
  showCreate.value = true;
  hits.value = [];
  q.value = '';
  selectedBien.value = null;

  f.fecha = new Date().toISOString().slice(0, 10);
  f.unidadAdscripcion = 'Hospital de la Amistad';
  f.ubicacionFisica = '';
  f.dictamenTexto = '';
}

function closeCreate() {
  showCreate.value = false;
}

async function buscar() {
  clearMessages();
  const term = q.value.trim();
  if (!term) { hits.value = []; return; }

  loadingSearch.value = true;
  try {
    const { data } = await axios.get(`${API}/dictamen/bienes`, { params: { q: term } });
    hits.value = Array.isArray(data) ? data : [];
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo buscar bienes.';
  } finally {
    loadingSearch.value = false;
  }
}

function selectBien(b: any) {
  selectedBien.value = b;
  f.ubicacionFisica = b?.ubicacion?.nombre || '';
}

async function guardar() {
  clearMessages();

  // si hay dictamen abierto y estamos editando -> update
  if (dictamen.value?.id) {
    if (!editMode.value) return;

    if (!f.dictamenTexto.trim()) { error.value = 'El dictamen (texto) es requerido.'; return; }

    loadingSave.value = true;
    try {
      const payload = {
        dictamenTexto: f.dictamenTexto.trim(),
        unidadAdscripcion: 'Hospital de la Amistad',
        ubicacionFisica: f.ubicacionFisica.trim() || null,
        fecha: f.fecha || null,
      };

      await axios.put(`${API}/dictamen/${dictamen.value.id}`, payload);
      await cargarDictamen(dictamen.value.id);
      await cargarListado();
      success.value = '✅ Cambios guardados.';
      editMode.value = false;
    } catch (e: any) {
      error.value = e?.response?.data?.error || 'No se pudo guardar.';
    } finally {
      loadingSave.value = false;
    }
    return;
  }

  // crear nuevo (desde modal crear)
  const bienId = selectedBien.value?.id;
  if (!bienId) { error.value = 'Selecciona un bien.'; return; }
  if (!f.dictamenTexto.trim()) { error.value = 'El dictamen (texto) es requerido.'; return; }

  loadingSave.value = true;
  try {
    const payload = {
      bienId,
      dictamenTexto: f.dictamenTexto.trim(),
      unidadAdscripcion: 'Hospital de la Amistad',
      ubicacionFisica: f.ubicacionFisica.trim() || null,
      fecha: f.fecha || null,
    };

    const { data } = await axios.post(`${API}/dictamen`, payload);
    success.value = '✅ Dictamen creado.';
    showCreate.value = false;
    await cargarListado();
    await openDetail(data.id);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo crear.';
  } finally {
    loadingSave.value = false;
  }
}

function onFile(ev: any) {
  file.value = ev?.target?.files?.[0] || null;
}

async function subirEscaneado() {
  clearMessages();
  if (!dictamen.value?.id) return;
  if (!file.value) { error.value = 'Selecciona un archivo (PDF/imagen).'; return; }

  loadingUpload.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file.value);

    await axios.post(`${API}/dictamen/${dictamen.value.id}/escaneado`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    file.value = null;
    await cargarDictamen(dictamen.value.id);
    await cargarListado();
    success.value = '✅ Escaneado subido.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo subir el escaneado.';
  } finally {
    loadingUpload.value = false;
  }
}

async function firmar() {
  clearMessages();
  if (!dictamen.value?.id) return;
  if (!hasScan(dictamen.value)) { error.value = 'Primero sube el escaneado para poder firmar.'; return; }
  if (!confirm('¿Firmar el dictamen?')) return;

  loadingSign.value = true;
  try {
    await axios.post(`${API}/dictamen/${dictamen.value.id}/firmar`);
    await cargarDictamen(dictamen.value.id);
    await cargarListado();
    success.value = '✅ Dictamen firmado.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo firmar.';
  } finally {
    loadingSign.value = false;
  }
}

async function cancelar() {
  clearMessages();
  if (!dictamen.value?.id) return;
  if (!confirm('¿Cancelar el dictamen?')) return;

  loadingCancel.value = true;
  try {
    await axios.post(`${API}/dictamen/${dictamen.value.id}/cancelar`);
    await cargarDictamen(dictamen.value.id);
    await cargarListado();
    success.value = '✅ Dictamen cancelado.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cancelar.';
  } finally {
    loadingCancel.value = false;
  }
}

onMounted(async () => {
  await loadMe();
  await cargarListado();

  const id = route.params.id ? Number(route.params.id) : null;
  if (id) await openDetail(id);
});

watch(
    () => route.params.id,
    async (v) => {
      const id = v ? Number(v) : null;
      if (id) await openDetail(id);
    }
);
</script>

<style scoped>
.input { @apply w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-green-600/40; }
.label { @apply block text-sm text-gray-600 mb-1; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-60; }
.btn-secondary { @apply bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300 disabled:opacity-60; }
.tab { @apply px-3 py-1 rounded border text-sm hover:bg-gray-50; }
.tab-on { @apply bg-green-50 border-green-300; }

.badge { @apply text-xs px-2 py-1 rounded border font-medium; }
.badge-yellow { @apply bg-yellow-50 border-yellow-200 text-yellow-700; }
.badge-green { @apply bg-green-50 border-green-200 text-green-700; }
.badge-red { @apply bg-red-50 border-red-200 text-red-700; }
.badge-gray { @apply bg-gray-50 border-gray-200 text-gray-600; }

.card { @apply p-3 rounded border bg-white; }

/* ✅ FIX: modal con altura máxima + scroll interno en el body */
.modal-backdrop { @apply fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50; }
.modal { @apply w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col; }
.modal-head { @apply px-4 py-3 border-b flex items-start justify-between gap-3; }
.modal-body { @apply p-4 overflow-y-auto flex-1; }

.file-input {
  @apply block w-full text-sm text-gray-700;
}
.file-input::file-selector-button {
  @apply mr-3 py-2 px-3 rounded border-0 bg-gray-200 text-gray-800 hover:bg-gray-300;
}
</style>
