<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-8 px-4">
    <div class="max-w-3xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-semibold text-gray-900">Importar inventario (Excel)</h2>
        <p class="text-sm text-gray-500">
          Los bienes importados se crearán en <b>BORRADOR</b>. Luego Control Patrimonial sube factura y resguardo firmado uno por uno.
        </p>
      </div>

      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div class="text-sm text-gray-600">
            Usa la plantilla con columnas correctas.
          </div>

          <a
              class="btn-secondary inline-flex items-center justify-center"
              href="/plantillas/plantilla_import_inventario.xlsx"
              download
          >
            Descargar plantilla
          </a>
        </div>

        <div class="mt-5">
          <label class="label">Archivo .xlsx</label>
          <input class="input" type="file" accept=".xlsx" @change="onFile" />
          <p class="help">Field requerido: <code>file</code></p>
        </div>

        <div class="mt-4 flex gap-2 justify-end">
          <button class="btn-secondary" type="button" @click="reset" :disabled="loading">Limpiar</button>
          <button class="btn" type="button" @click="importar" :disabled="!file || loading">
            <span v-if="!loading">Importar</span>
            <span v-else>Importando...</span>
          </button>
        </div>

        <div v-if="msg" class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {{ msg }}
        </div>

        <div v-if="err" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {{ err }}
        </div>

        <div v-if="result" class="mt-5">
          <div class="text-sm text-gray-700">
            <b>Creados:</b> {{ result.creados }} —
            <b>Errores:</b> {{ result.errores?.length || 0 }}
          </div>

          <div v-if="(result.errores || []).length" class="mt-3 border rounded-xl overflow-hidden">
            <div class="bg-gray-50 px-3 py-2 text-sm font-semibold">Errores</div>
            <div class="max-h-[280px] overflow-auto divide-y">
              <div v-for="e in result.errores" :key="e.fila" class="px-3 py-2 text-sm">
                <b>Fila {{ e.fila }}:</b> <span class="text-red-700">{{ e.error }}</span>
              </div>
            </div>
          </div>

          <div v-else class="mt-3 text-sm text-green-700">
            ✅ Importación sin errores.
          </div>
        </div>
      </div>

      <div class="mt-6 text-xs text-gray-500">
        Endpoint: <code>POST /api/inventario/import-excel</code> (multipart/form-data: file)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";
axios.defaults.withCredentials = true;

const API = "/api/inventario/import-excel";

const file = ref<File | null>(null);
const loading = ref(false);
const msg = ref("");
const err = ref("");
const result = ref<any>(null);

function onFile(ev: any) {
  file.value = ev?.target?.files?.[0] || null;
  msg.value = "";
  err.value = "";
  result.value = null;
}

function reset() {
  file.value = null;
  msg.value = "";
  err.value = "";
  result.value = null;
}

async function importar() {
  if (!file.value) return;

  msg.value = "";
  err.value = "";
  result.value = null;

  const fd = new FormData();
  fd.append("file", file.value);

  loading.value = true;
  try {
    const { data } = await axios.post(API, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    result.value = data;
    msg.value = `Importación finalizada. Creados: ${data.creados}. Errores: ${(data.errores || []).length}.`;
  } catch (e: any) {
    err.value = e?.response?.data?.error || "No se pudo importar el Excel.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }
.help { @apply mt-1 text-xs text-gray-500; }
.input {
  @apply w-full border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none
  focus:ring-2 focus:ring-green-600/30 focus:border-green-600;
}
.btn {
  @apply bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-green-700
  disabled:opacity-60 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed;
}
</style>
