<!-- hospital-inventarios-web/src/pages/ItemForm.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-semibold text-gray-900">
            {{ isEdit ? 'Editar bien' : 'Nuevo bien' }}
          </h2>
          <p class="text-sm text-gray-500">
            Captura la información del bien y sus datos de control patrimonial.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span
              class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              :class="isEdit ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'"
          >
            {{ isEdit ? 'Modo edición' : 'Registro nuevo' }}
          </span>
        </div>
      </div>

      <!-- Card -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100">
        <form @submit.prevent="onSubmit" class="p-6 space-y-6">
          <!-- Sección: Identificación -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-green-600 text-white flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Identificación</h3>
                <p class="text-xs text-gray-500">Datos básicos del bien</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label">
                  No. inventario <span class="req">*</span>
                </label>
                <input class="input" v-model.trim="f.noInventario" placeholder="Ej. 515-H-0375" />
              </div>

              <div>
                <label class="label">
                  Nombre del bien <span class="req">*</span>
                </label>
                <input class="input" v-model.trim="f.nombre" placeholder="Ej. Laptop Dell Inspiron 3530 15.6”" />
              </div>
            </div>
          </section>

          <hr class="border-gray-100" />

          <!-- Sección: Responsable -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Responsable</h3>
                <p class="text-xs text-gray-500">Persona que resguarda el bien</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label">
                  Responsable <span class="req">*</span>
                </label>
                <input class="input" v-model.trim="f.responsable" placeholder="Ej. Juan Pérez" />
              </div>

              <div>
                <label class="label">
                  RFC <span class="req">*</span>
                </label>
                <input class="input" v-model.trim="f.rfc" placeholder="Ej. HERR990126P1" />
              </div>
            </div>
          </section>

          <hr class="border-gray-100" />

          <!-- Sección: Clasificación / Catálogos -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 7h18" />
                  <path d="M3 12h18" />
                  <path d="M3 17h18" />
                  <path d="M7 7v10" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Clasificación y ubicación</h3>
                <p class="text-xs text-gray-500">Catálogos del bien</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Clasificación (NUEVO) -->
              <div>
                <label class="label">Clasificación (sigla)</label>
                <select class="input" v-model.number="f.clasificacionId">
                  <option :value="null">(Sin clasificación)</option>
                  <option v-for="c in clasificaciones" :key="c.id" :value="c.id">
                    {{ formatClasificacion(c) }}
                  </option>
                </select>
                <p class="help" v-if="selectedClasificacion">
                  Seleccionada:
                  <b>{{ selectedClasificacion.sigla }}</b>
                  <span v-if="selectedClasificacion.cuenta"> · Cuenta: <b>{{ selectedClasificacion.cuenta }}</b></span>
                  <span v-if="selectedClasificacion.nombre"> · {{ selectedClasificacion.nombre }}</span>
                </p>

              </div>

              <div>
                <label class="label">Estado físico</label>
                <select class="input" v-model.number="f.estadoId">
                  <option :value="null">(Sin estado)</option>
                  <option v-for="e in estados" :key="e.id" :value="e.id">{{ e.label }}</option>
                </select>
              </div>

              <div>
                <label class="label">Ubicación</label>
                <select class="input" v-model.number="f.ubicacionId">
                  <option :value="null">(Sin ubicación)</option>
                  <option v-for="u in ubicaciones" :key="u.id" :value="u.id">{{ u.nombre }}</option>
                </select>
              </div>

              <div>
                <label class="label">Tipo de bien</label>
                <select class="input" v-model="f.tipoBien">
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="MEDICO">Médico</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label class="label">Categoría del bien</label>
                <select class="input" v-model="f.categoriaBien">
                  <option value="GENERAL">General (Mantenimiento)</option>
                  <option value="INFORMATICA">Informática (TI)</option>
                </select>
              </div>
            </div>
          </section>

          <hr class="border-gray-100" />

          <!-- Sección: Datos de compra -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 7H4" />
                  <path d="M6 7l1-3h10l1 3" />
                  <path d="M6 7v13h12V7" />
                  <path d="M9 11h6" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Adquisición</h3>
                <p class="text-xs text-gray-500">Factura, fechas y costo</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label">No. factura</label>
                <input class="input" v-model.trim="f.noFactura" placeholder="Ej. A1794" />
              </div>

              <div>
                <label class="label">Fecha de adjudicación</label>
                <input class="input" type="date" v-model="f.fechaAdjudicacion" />
              </div>

              <div>
                <label class="label">Costo de adquisición</label>
                <input
                    class="input"
                    type="number"
                    min="0"
                    step="0.01"
                    v-model="f.costoAdquisicion"
                    placeholder="Ej. 15000"
                />
              </div>

              <div>
                <label class="label">Tipo de propiedad</label>
                <select class="input" v-model="f.tipoPropiedad">
                  <option value="">(Sin especificar)</option>
                  <option value="CONTABLE">Contable</option>
                  <option value="PROPIO">Propio</option>
                  <option value="COMODATO">Comodato</option>
                </select>
              </div>

              <div>
                <label class="label">Fecha de entrega</label>
                <input class="input" type="date" v-model="f.fechaEntrega" />
              </div>
            </div>
          </section>

          <hr class="border-gray-100" />

          <!-- Sección: Datos técnicos -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 16V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2Z" />
                  <path d="M8 6V4h8v2" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Datos del equipo</h3>
                <p class="text-xs text-gray-500">Modelo, marca y serie</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label">Modelo</label>
                <input class="input" v-model.trim="f.modelo" placeholder="Ej. Inspiron 3530" />
              </div>

              <div>
                <label class="label">Marca</label>
                <input class="input" v-model.trim="f.marca" placeholder="Ej. Dell" />
              </div>

              <div class="md:col-span-2">
                <label class="label">No. serie</label>
                <input class="input" v-model.trim="f.noSerie" placeholder="Ej. CXS484948" />
              </div>

              <!-- ✅ Foto (link) dentro del grid -->
              <div class="md:col-span-2">
                <label class="label">Foto (link)</label>
                <input
                    class="input"
                    v-model.trim="f.fotoUrl"
                    placeholder="Pega aquí el enlace (Drive, OneDrive o URL directa)"
                />

                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <a
                      v-if="f.fotoUrl && isProbablyUrl(f.fotoUrl)"
                      class="btn-secondary"
                      :href="f.fotoUrl"
                      target="_blank"
                      rel="noopener"
                  >
                    Abrir enlace
                  </a>

                  <span v-else class="help">
                    Tip: pega un enlace válido para habilitar el botón “Abrir enlace”.
                  </span>
                </div>

                <!-- ✅ preview suave (opcional) -->
                <div v-if="fotoPreviewUrl" class="mt-3">
                  <div class="text-xs text-gray-500 mb-1">Vista previa:</div>
                  <div class="rounded-xl border bg-white p-2 inline-block">
                    <img
                        :src="fotoPreviewUrl"
                        alt="Foto del bien"
                        class="h-28 w-auto rounded-lg object-cover"
                        @error="onFotoPreviewError"
                    />
                  </div>
                  <p class="help mt-2">
                    Si no se muestra, revisa permisos del Drive (debe permitir ver) o usa una URL directa de imagen.
                  </p>
                </div>
              </div>
            </div>


          </section>

          <hr class="border-gray-100" />

          <!-- Sección: Proveedor -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V8l7-4 7 4v13" />
                  <path d="M9 21v-8h6v8" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Proveedor</h3>
                <p class="text-xs text-gray-500">Asociación opcional</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="label">Proveedor</label>
                <select class="input" v-model.number="f.proveedorId">
                  <option :value="null">(Sin proveedor)</option>
                  <option v-for="p in proveedores" :key="p.id" :value="p.id">
                    {{ p.nombre }}
                  </option>
                </select>
              </div>
            </div>
          </section>

          <hr class="border-gray-100" />

          <!-- Observaciones -->
          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-gray-200 text-gray-800 flex items-center justify-center shadow">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16v16H4z" opacity="0" />
                  <path d="M7 7h10" />
                  <path d="M7 11h10" />
                  <path d="M7 15h7" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">Observaciones</h3>
                <p class="text-xs text-gray-500">Notas relevantes del bien</p>
              </div>
            </div>

            <div>
              <textarea
                  class="input min-h-[110px]"
                  v-model.trim="f.observaciones"
                  placeholder="Notas u observaciones relevantes"
              ></textarea>
            </div>
          </section>

          <!-- Acciones -->
          <div class="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <router-link to="/" class="btn-secondary">
              Cancelar
            </router-link>
            <button class="btn" type="submit">
              {{ isEdit ? 'Guardar cambios' : 'Guardar bien' }}
            </button>
          </div>

          <p class="text-xs text-gray-400">
            <span class="req">*</span> Campos obligatorios.
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
axios.defaults.withCredentials = true;

type Ubicacion = { id:number; nombre:string };
type Estado = { id:number; label:string };

// NUEVO
type Clasificacion = { id:number; sigla:string; nombre?:string | null; cuenta?:string | null };

const API = '/api';
const router = useRouter();
const route  = useRoute();
const isEdit = computed(()=> !!route.params.id);

// formulario reactivo (camelCase para el UI)
const f = reactive({
  noInventario: '',
  nombre: '',
  responsable: '',
  rfc: '',
  noFactura: '',
  fechaAdjudicacion: '',
  modelo: '',
  marca: '',
  noSerie: '',
  observaciones: '',
  fechaEntrega: '',
  tipoBien: 'ADMINISTRATIVO',
  categoriaBien: 'GENERAL',
  estadoId: null as number | null,
  ubicacionId: null as number | null,

  // Nuevos campos
  costoAdquisicion: '',
  tipoPropiedad: '',
  proveedorId: null as number | null,

  // ✅ NUEVO: clasificacion
  clasificacionId: null as number | null,
  fotoUrl:'',
});

const ubicaciones = reactive<Ubicacion[]>([]);
const estados     = reactive<Estado[]>([]);
const proveedores = reactive<any[]>([]);

// ✅ NUEVO: clasificaciones
const clasificaciones = reactive<Clasificacion[]>([]);

const selectedClasificacion = computed(() => {
  if (!f.clasificacionId) return null;
  return clasificaciones.find(c => c.id === f.clasificacionId) || null;
});

function isProbablyUrl(v: string) {
  try { new URL(v); return true; } catch { return false; }
}

// Convierte links de Drive tipo /file/d/ID/view a un link usable para preview (si el archivo es público)
function drivePreviewUrl(raw: string) {
  const s = (raw || '').trim();
  if (!s) return '';

  // casos típicos:
  // https://drive.google.com/file/d/<ID>/view?usp=sharing
  const m1 = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m1?.[1]) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;

  // https://drive.google.com/open?id=<ID>
  const m2 = s.match(/[?&]id=([^&]+)/i);
  if (s.includes('drive.google.com') && m2?.[1]) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;

  return '';
}

const fotoPreviewUrl = computed(() => {
  const raw = (f.fotoUrl || '').trim();
  if (!raw) return '';

  // si es drive, intento URL para preview
  const drive = drivePreviewUrl(raw);
  if (drive) return drive;

  // si parece imagen directa, la usamos tal cual
  const lower = raw.toLowerCase();
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif')) {
    return raw;
  }

  return '';
});

function onFotoPreviewError(e: Event) {
  // si falla el preview, lo ocultamos (evita que se vea "roto")
  const img = e.target as HTMLImageElement | null;
  if (img) img.style.display = 'none';
}


// helpers
function toISODate(d: string | null | undefined) {
  if (!d) return null;
  return d; // input date ya viene YYYY-MM-DD
}

function formatClasificacion(c: Clasificacion) {
  // Prioridad visual: SIGLA — CUENTA — NOMBRE (si existe)
  const parts: string[] = [];
  if (c.sigla) parts.push(c.sigla);
  if (c.cuenta) parts.push(c.cuenta);
  if (c.nombre) parts.push(c.nombre);
  return parts.join(' — ');
}

async function loadCatalogs(){
  const [u, e, p] = await Promise.all([
    axios.get<Ubicacion[]>(`${API}/ubicaciones`),
    axios.get<Estado[]>(`${API}/estados-fisicos`),
    axios.get(`${API}/proveedores`),
  ]);

  ubicaciones.splice(0, ubicaciones.length, ...u.data);
  estados.splice(0, estados.length, ...e.data);
  proveedores.splice(0, proveedores.length, ...(Array.isArray(p.data) ? p.data : []));

  // ✅ NUEVO: cargar clasificaciones (si el endpoint existe)
  try {
    const c = await axios.get<Clasificacion[]>(`${API}/clasificaciones`);
    clasificaciones.splice(0, clasificaciones.length, ...(Array.isArray(c.data) ? c.data : []));
  } catch (err) {
    // si aún no tienes endpoint, no rompas el form
    console.warn('No se pudo cargar clasificaciones. Revisa GET /api/clasificaciones', err);
    clasificaciones.splice(0, clasificaciones.length);
  }
}

async function loadIfEdit(){
  if (!isEdit.value) return;
  const { data } = await axios.get(`${API}/inventario/${route.params.id}`);

  f.noInventario       = data.no_inventario ?? '';
  f.nombre             = data.nombre ?? '';
  f.responsable        = data.responsable ?? '';
  f.rfc                = data.rfc ?? '';
  f.noFactura          = data.no_factura ?? '';
  f.fechaAdjudicacion  = data.fecha_adjudicacion?.substring(0,10) ?? '';
  f.modelo             = data.modelo ?? '';
  f.marca              = data.marca ?? '';
  f.noSerie            = data.no_serie ?? '';
  f.observaciones      = data.observaciones ?? '';
  f.fechaEntrega       = data.fecha_entrega?.substring(0,10) ?? '';
  f.tipoBien           = data.tipo ?? 'ADMINISTRATIVO';
  f.categoriaBien      = data.categoria ?? 'GENERAL';
  f.estadoId           = data.estadoId ?? null;
  f.ubicacionId        = data.ubicacionId ?? null;
  f.costoAdquisicion   = data.costo_adquisicion ?? '';
  f.tipoPropiedad      = data.tipoPropiedad ?? '';
  f.proveedorId        = data.proveedorId ?? null;

  // ✅ NUEVO
  f.clasificacionId    = data.clasificacionId ?? null;
  f.fotoUrl            = data.fotoUrl ?? '';

}

async function onSubmit(){
  // Validación mínima
  if (!f.noInventario.trim() || !f.nombre.trim()) {
    alert('No. inventario y nombre son obligatorios');
    return;
  }
  if (!f.responsable.trim()) {
    alert('Responsable es obligatorio');
    return;
  }
  if (!f.rfc.trim()) {
    alert('RFC es obligatorio');
    return;
  }

  const payload = {
    no_inventario:      f.noInventario.trim(),
    nombre:             f.nombre.trim(),
    responsable:        f.responsable.trim(),
    rfc:                f.rfc.trim(),
    no_factura:         f.noFactura.trim() || null,
    fecha_adjudicacion: toISODate(f.fechaAdjudicacion),
    modelo:             f.modelo.trim() || null,
    marca:              f.marca.trim() || null,
    no_serie:           f.noSerie.trim() || null,
    observaciones:      f.observaciones.trim() || null,
    fecha_entrega:      toISODate(f.fechaEntrega),

    tipo:               f.tipoBien,
    categoria:          f.categoriaBien,
    estadoId:           f.estadoId ?? null,
    ubicacionId:        f.ubicacionId ?? null,

    costo_adquisicion:  f.costoAdquisicion ? Number(f.costoAdquisicion) : null,
    tipoPropiedad:      f.tipoPropiedad || null,
    proveedorId:        f.proveedorId ?? null,

    // ✅ NUEVO
    clasificacionId:    f.clasificacionId ?? null,
    fotoUrl: f.fotoUrl.trim() || null,
  };

  if (isEdit.value) {
    await axios.put(`${API}/inventario/${route.params.id}`, payload);
  } else {
    await axios.post(`${API}/inventario`, payload);
  }
  router.push('/');
}

onMounted(async ()=>{
  await loadCatalogs();
  await loadIfEdit();
});
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }
.req { @apply text-red-500; }
.help { @apply text-xs text-gray-500 mt-1; }

.input {
  @apply w-full border border-gray-200 rounded-xl px-3 py-2
  outline-none bg-white
  focus:ring-2 focus:ring-green-600/30 focus:border-green-600
  placeholder:text-gray-400;
}

.btn {
  @apply bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium
  hover:bg-green-700
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-secondary {
  @apply bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200
  hover:bg-gray-50
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.help { @apply mt-1 text-xs text-gray-500; }

</style>
