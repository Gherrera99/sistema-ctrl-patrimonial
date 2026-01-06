<template>
  <div
      v-if="open"
      ref="backdrop"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
      tabindex="0"
  >
    <div
        class="w-full max-w-lg bg-white/95 rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        @click.stop
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b bg-white flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="h-10 w-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M3 21h18" />
              <path d="M5 21V8l7-4 7 4v13" />
              <path d="M9 21v-8h6v8" />
            </svg>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ proveedor ? 'Editar proveedor' : 'Nuevo proveedor' }}
            </h3>
            <p class="text-xs text-gray-500">
              Captura datos de contacto y fiscales. El nombre es obligatorio.
            </p>
          </div>
        </div>

        <button
            class="icon-btn"
            type="button"
            :disabled="loading"
            @click="emit('close')"
            aria-label="Cerrar"
            title="Cerrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <form @submit.prevent="guardar" class="p-6 space-y-4">
        <!-- Alerts -->
        <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ error }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="label">
              Nombre <span class="req">*</span>
            </label>
            <input class="input" v-model.trim="f.nombre" placeholder="Ej. Distribuidora ABC S.A. de C.V." :disabled="loading" />
          </div>

          <div>
            <label class="label">RFC</label>
            <input class="input" v-model.trim="f.rfc" placeholder="Ej. ABC010203XYZ" :disabled="loading" />
            <p class="help">Opcional. Se guardará en mayúsculas.</p>
          </div>

          <div>
            <label class="label">Teléfono</label>
            <input class="input" v-model.trim="f.telefono" placeholder="Ej. 999 123 4567" :disabled="loading" />
          </div>

          <div class="md:col-span-2">
            <label class="label">Correo</label>
            <input class="input" v-model.trim="f.correo" placeholder="Ej. ventas@proveedor.com" :disabled="loading" />
          </div>

          <div class="md:col-span-2">
            <label class="label">Dirección</label>
            <textarea class="input min-h-[90px]" v-model.trim="f.direccion" placeholder="Calle, número, colonia, ciudad..."
                      :disabled="loading"></textarea>
          </div>
        </div>

        <!-- Footer buttons -->
        <div class="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button class="btn-secondary" type="button" @click="emit('close')" :disabled="loading">
            Cancelar
          </button>

          <button class="btn" type="submit" :disabled="loading">
            <span v-if="!loading">Guardar</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
              </svg>
              Guardando...
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, ref, nextTick } from "vue";
import axios from "axios";
axios.defaults.withCredentials = true;

const API = "/api";

const props = defineProps<{
  open: boolean;
  proveedor: any | null;
}>();

const emit = defineEmits(["close", "saved"]);

const loading = ref(false);
const error = ref("");
const backdrop = ref<HTMLElement | null>(null);

const f = reactive({
  nombre: "",
  rfc: "",
  telefono: "",
  correo: "",
  direccion: "",
});

function clear() {
  error.value = "";
}

function isValidEmail(v: string) {
  if (!v) return true; // correo opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

watch(
    () => props.open,
    async (v) => {
      if (v) {
        await nextTick(); // para que el modal reciba focus (esc)
        backdrop.value?.focus();
      }
    },
    { immediate: true }
);

watch(
    () => props.proveedor,
    (p) => {
      clear();
      if (p) {
        f.nombre = p.nombre ?? "";
        f.rfc = p.rfc ?? "";
        f.telefono = p.telefono ?? "";
        f.correo = p.correo ?? "";
        f.direccion = p.direccion ?? "";
      } else {
        f.nombre = "";
        f.rfc = "";
        f.telefono = "";
        f.correo = "";
        f.direccion = "";
      }
    },
    { immediate: true }
);

async function guardar() {
  clear();

  if (!f.nombre.trim()) {
    error.value = "El nombre es obligatorio.";
    return;
  }
  if (!isValidEmail(f.correo.trim())) {
    error.value = "El correo no tiene un formato válido.";
    return;
  }

  const body = {
    nombre: f.nombre.trim(),
    rfc: f.rfc.trim() ? f.rfc.trim().toUpperCase() : null,
    telefono: f.telefono.trim() || null,
    correo: f.correo.trim() || null,
    direccion: f.direccion.trim() || null,
  };

  loading.value = true;
  try {
    if (props.proveedor?.id) {
      await axios.put(`${API}/proveedores/${props.proveedor.id}`, body);
    } else {
      await axios.post(`${API}/proveedores`, body);
    }

    emit("saved");
    emit("close");
  } catch (e: any) {
    error.value = e?.response?.data?.error || "No se pudo guardar el proveedor.";
  } finally {
    loading.value = false;
  }
}
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
  hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.btn-secondary {
  @apply bg-white text-gray-700 px-4 py-2.5 rounded-xl font-medium border border-gray-200
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

.icon-btn {
  @apply p-2 rounded-lg border border-gray-200 bg-white text-gray-600
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed;
}
</style>
