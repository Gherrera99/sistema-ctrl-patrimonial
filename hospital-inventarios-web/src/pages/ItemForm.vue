<!-- hospital-inventarios-web/src/pages/ItemForm.vue -->
<template>
  <div class="max-w-3xl mx-auto mt-8 bg-white p-6 rounded shadow">
    <h2 class="text-xl font-semibold mb-4">{{ isEdit ? 'Editar bien' : 'Nuevo bien' }}</h2>

    <form @submit.prevent="onSubmit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- No. inventario -->
      <div>
        <label class="label">No. inventario</label>
        <input class="input" v-model.trim="f.noInventario" placeholder="Ej. 515-H-0375" />
      </div>

      <!-- Nombre del bien -->
      <div>
        <label class="label">Nombre del bien</label>
        <input class="input" v-model.trim="f.nombre" placeholder="Ej. Laptop Dell Inspiron 3530 15.6”" />
      </div>

      <!-- Responsable -->
      <div>
        <label class="label">Responsable</label>
        <input class="input" v-model.trim="f.responsable" placeholder="Ej. Juan Pérez" />
      </div>

      <!-- RFC -->
      <div>
        <label class="label">RFC</label>
        <input class="input" v-model.trim="f.rfc" placeholder="Ej. HERR990126P1" />
      </div>

      <!-- No. factura -->
      <div>
        <label class="label">No. factura</label>
        <input class="input" v-model.trim="f.noFactura" placeholder="Ej. A1794" />
      </div>

      <!-- Fecha de adjudicación -->
      <div>
        <label class="label">Fecha de adjudicación</label>
        <input class="input" type="date" v-model="f.fechaAdjudicacion" />
      </div>

      <!-- Modelo -->
      <div>
        <label class="label">Modelo</label>
        <input class="input" v-model.trim="f.modelo" placeholder="Ej. Inspiron 3530" />
      </div>

      <!-- Marca -->
      <div>
        <label class="label">Marca</label>
        <input class="input" v-model.trim="f.marca" placeholder="Ej. Dell" />
      </div>

      <!-- No. serie -->
      <div>
        <label class="label">No. serie</label>
        <input class="input" v-model.trim="f.noSerie" placeholder="Ej. CXS484948" />
      </div>

      <!-- Estado físico -->
      <div>
        <label class="label">Estado físico</label>
        <select class="input" v-model.number="f.estadoId">
          <option disabled :value="null">Selecciona estado</option>
          <option v-for="e in estados" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
      </div>

      <!-- Ubicación -->
      <div>
        <label class="label">Ubicación</label>
        <select class="input" v-model.number="f.ubicacionId">
          <option disabled :value="null">Selecciona ubicación</option>
          <option v-for="u in ubicaciones" :key="u.id" :value="u.id">{{ u.nombre }}</option>
        </select>
      </div>

      <!-- Costo de adquisición -->
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

      <!-- Tipo de Propiedad -->
      <div>
        <label class="label">Tipo de propiedad</label>
        <select class="input" v-model="f.tipoPropiedad">
          <option disabled value="">Selecciona tipo</option>
          <option value="CONTABLE">Contable</option>
          <option value="PROPIO">Propio</option>
          <option value="COMODATO">Comodato</option>
        </select>
      </div>

      <!-- Proveedor -->
      <div>
        <label class="label">Proveedor</label>
        <select class="input" v-model.number="f.proveedorId">
          <option disabled value="">Selecciona proveedor</option>
          <option v-for="p in proveedores" :key="p.id" :value="p.id">
            {{ p.nombre }}
          </option>
        </select>
      </div>

      <!-- Observaciones (full width) -->
      <div class="md:col-span-2">
        <label class="label">Observaciones</label>
        <textarea class="input min-h-[90px]" v-model.trim="f.observaciones"
                  placeholder="Notas u observaciones relevantes"></textarea>
      </div>

      <!-- Fecha de entrega -->
      <div>
        <label class="label">Fecha de entrega</label>
        <input class="input" type="date" v-model="f.fechaEntrega" />
      </div>

      <!-- Tipo de bien -->
      <div>
        <label class="label">Tipo de bien</label>
        <select class="input" v-model="f.tipoBien">
          <option value="ADMINISTRATIVO">Administrativo</option>
          <option value="MEDICO">Médico</option>
        </select>
      </div>

      <div class="md:col-span-2 flex gap-2 pt-2">
        <button class="btn" type="submit">{{ isEdit ? 'Guardar' : 'Guardar' }}</button>
        <router-link to="/" class="btn-secondary">Cancelar</router-link>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
axios.defaults.withCredentials = true;

type Ubicacion = { id:number; nombre:string };
type Estado = { id:number; label:string };

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
  estadoId: null,
  ubicacionId: null,

  // Nuevos campos
  costoAdquisicion: '',
  tipoPropiedad: '',
  proveedorId: null,
});


const ubicaciones = reactive<Ubicacion[]>([]);
const estados     = reactive<Estado[]>([]);

const proveedores = reactive<any[]>([]);


// helpers
function toISODate(d: string | null | undefined) {
  if (!d) return null;
  return d; // input date ya viene YYYY-MM-DD
}

async function loadCatalogs(){
  const [u, e, p] = await Promise.all([
    axios.get<Ubicacion[]>(`${API}/ubicaciones`),
    axios.get<Estado[]>(`${API}/estados-fisicos`),
    axios.get(`${API}/proveedores`),
  ]);
  ubicaciones.splice(0, ubicaciones.length, ...u.data);
  estados.splice(0, estados.length, ...e.data);
  proveedores.splice(0, proveedores.length, ...p.data);
}

async function loadIfEdit(){
  if (!isEdit.value) return;
  const { data } = await axios.get(`${API}/inventario/${route.params.id}`);
  // adaptar snake_case -> camelCase (OJO: ahora la API devuelve 'tipo')
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
  f.estadoId           = data.estadoId ?? null;
  f.ubicacionId        = data.ubicacionId ?? null;
  f.costoAdquisicion = data.costo_adquisicion ?? '';
  f.tipoPropiedad    = data.tipoPropiedad ?? '';
  f.proveedorId      = data.proveedorId ?? null;
}

async function onSubmit(){
  // Validación mínima
  if (!f.noInventario.trim() || !f.nombre.trim()) {
    alert('noInventario y nombre son obligatorios');
    return;
  }

  const payload = {
    no_inventario:      f.noInventario.trim(),
    nombre:             f.nombre.trim(),
    responsable:        f.responsable.trim() || '',
    rfc:                f.rfc.trim() || '',
    no_factura:         f.noFactura.trim() || null,
    fecha_adjudicacion: toISODate(f.fechaAdjudicacion),
    modelo:             f.modelo.trim() || null,
    marca:              f.marca.trim() || null,
    no_serie:           f.noSerie.trim() || null,
    observaciones:      f.observaciones.trim() || null,
    fecha_entrega:      toISODate(f.fechaEntrega),

    tipo:               f.tipoBien,
    estadoId:           f.estadoId ?? null,
    ubicacionId:        f.ubicacionId ?? null,

    // Nuevos campos
    costo_adquisicion:  f.costoAdquisicion ? Number(f.costoAdquisicion) : null,
    tipoPropiedad:      f.tipoPropiedad || null,
    proveedorId:        f.proveedorId ?? null,
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
.label { @apply block text-sm text-gray-600 mb-1; }
.input { @apply w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-green-600/40; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.btn-secondary { @apply bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300; }
</style>
