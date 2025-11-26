<template>
  <div
      v-if="open"
      class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50"
  >
    <div class="bg-white rounded shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4">

      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Movimientos del Bien</h2>
        <button @click="$emit('close')" class="text-red-600 font-bold text-lg">X</button>
      </div>

      <table class="w-full text-sm border">
        <thead class="bg-gray-100 border-b">
        <tr>
          <th class="p-2 text-left">Fecha</th>
          <th class="p-2 text-left">Tipo</th>
          <th class="p-2 text-left">Motivo</th>
          <th class="p-2 text-left">Antes</th>
          <th class="p-2 text-left">Después</th>
          <th class="p-2 text-left">Usuario</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="m in movimientos" :key="m.id" class="border-b">
          <td class="p-2">{{ formatFecha(m.fecha) }}</td>
          <td class="p-2">{{ m.tipo }}</td>
          <td class="p-2">{{ m.motivo }}</td>

          <td class="p-2">
            {{ m.responsableAntes || m.ubicacionAntes || "-" }}
          </td>

          <td class="p-2">
            {{ m.responsableDespues || m.ubicacionDespues || "-" }}
          </td>

          <td class="p-2">
            {{ m.usuario?.name || "-" }}
          </td>
        </tr>

        <tr v-if="movimientos.length === 0">
          <td colspan="6" class="p-4 text-center text-gray-500">No hay movimientos registrados</td>
        </tr>
        </tbody>
      </table>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import axios from "axios";

const props = defineProps({
  open: Boolean,
  bienId: Number,
});

const movimientos = ref([]);

watch(
    () => props.open,
    async (v) => {
      if (v && props.bienId) {
        await cargarMovimientos();
      }
    }
);

async function cargarMovimientos() {
  try {
    const res = await axios.get(`/api/movimientos/${props.bienId}`);
    movimientos.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error("Error cargando movimientos", e);
  }
}

function formatFecha(v) {
  if (!v) return "-";

  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<style scoped>
th,
td {
  border-right: 1px solid #e5e5e5;
}
</style>
