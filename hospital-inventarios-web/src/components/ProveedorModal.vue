<template>
  <div
      v-if="open"
      class="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
  >
    <div class="bg-white rounded shadow max-w-lg w-full p-6">
      <h3 class="text-lg font-semibold mb-4">
        {{ proveedor ? 'Editar proveedor' : 'Nuevo proveedor' }}
      </h3>

      <form @submit.prevent="guardar" class="grid grid-cols-1 gap-3">
        <div>
          <label class="label">Nombre</label>
          <input class="input" v-model.trim="f.nombre" />
        </div>

        <div>
          <label class="label">RFC</label>
          <input class="input" v-model.trim="f.rfc" />
        </div>

        <div>
          <label class="label">Teléfono</label>
          <input class="input" v-model.trim="f.telefono" />
        </div>

        <div>
          <label class="label">Correo</label>
          <input class="input" v-model.trim="f.correo" />
        </div>

        <div>
          <label class="label">Dirección</label>
          <textarea class="input" v-model.trim="f.direccion"></textarea>
        </div>

        <div class="flex gap-2 mt-2">
          <button class="btn" type="submit">Guardar</button>
          <button class="btn-secondary" @click.prevent="$emit('close')">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import axios from "axios";
axios.defaults.withCredentials = true;

const API = "/api";

const props = defineProps({
  open: Boolean,
  proveedor: Object,
});

const emit = defineEmits(["close", "saved"]);

const f = reactive({
  nombre: "",
  rfc: "",
  telefono: "",
  correo: "",
  direccion: "",
});

watch(
    () => props.proveedor,
    p => {
      if (p) {
        f.nombre = p.nombre;
        f.rfc = p.rfc || "";
        f.telefono = p.telefono || "";
        f.correo = p.correo || "";
        f.direccion = p.direccion || "";
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
  const body = { ...f };

  if (props.proveedor) {
    await axios.put(`${API}/proveedores/${props.proveedor.id}`, body);
  } else {
    await axios.post(`${API}/proveedores`, body);
  }

  emit("saved");
  emit("close");
}
</script>

<style scoped>
.label { @apply block text-sm text-gray-600 mb-1; }
.input { @apply w-full border rounded px-3 py-2; }
.btn { @apply bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700; }
.btn-secondary { @apply bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300; }
</style>
