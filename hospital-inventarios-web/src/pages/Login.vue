<!-- src/pages/Login.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="mx-auto mb-3 h-12 w-12 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow">
          <!-- icon simple -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a7 7 0 0 1 7 7v3a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V9a7 7 0 0 1 7-7Z" />
            <path d="M8 16v2a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2" />
          </svg>
        </div>

        <h1 class="text-2xl font-semibold text-gray-900">CONTROL PATRIMONIAL</h1>
        <p class="text-sm text-gray-500">Accede con tu usuario institucional</p>
      </div>

      <!-- Card -->
      <div class="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
        <p class="text-sm text-gray-500 mb-4">Ingresa tus credenciales para continuar</p>

        <!-- Error -->
        <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ error }}
        </div>

        <form @submit.prevent="submit" class="space-y-4">
          <!-- Email -->
          <div>
            <label class="label">Usuario / Email</label>
            <div class="relative">
              <span class="left-icon">
                <!-- mail icon -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16v16H4z" opacity="0" />
                  <path d="M4 6h16" />
                  <path d="m4 6 8 7 8-7" />
                  <path d="M4 18h16" />
                </svg>
              </span>

              <input
                  v-model.trim="email"
                  autocomplete="username"
                  inputmode="email"
                  placeholder="usuario@correo.com"
                  class="input input-icon"
                  :disabled="loading"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="label">Contraseña</label>
            <div class="relative">
              <span class="left-icon">
                <!-- lock icon -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  <path d="M7 11h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
                </svg>
              </span>

              <input
                  v-model="password"
                  :type="showPass ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="input input-pass"
                  :disabled="loading"
              />

              <button
                  type="button"
                  class="right-btn"
                  @click="showPass = !showPass"
                  :disabled="loading"
                  :aria-label="showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              >
                <span class="text-xs font-medium text-gray-600">
                  {{ showPass ? 'Ocultar' : 'Mostrar' }}
                </span>
              </button>
            </div>

            <div class="mt-2 flex items-center justify-between">
              <label class="inline-flex items-center gap-2 text-sm text-gray-600 select-none">
                <input type="checkbox" v-model="remember" class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600" />
                Recordarme
              </label>

              <span class="text-xs text-gray-400">v{{ appVersion }}</span>
            </div>
          </div>

          <!-- Submit -->
          <button class="btn w-full" :disabled="loading || !email || !password">
            <span v-if="!loading">Entrar</span>
            <span v-else class="inline-flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"></path>
              </svg>
              Entrando...
            </span>
          </button>
        </form>

        <div class="mt-5 pt-4 border-t text-xs text-gray-500">
          Si tienes problemas para acceder, valida tu usuario con el administrador del sistema.
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-400 mt-5">
        Hospital de la Amistad • Sistema de Control Patrimonial
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuth } from '../stores/auth';
import { useRouter } from 'vue-router';

const r = useRouter();
const auth = useAuth();

const email = ref('');
const password = ref('');
const showPass = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const remember = ref(true);

// si no tienes versión, déjalo fijo
const appVersion = import.meta?.env?.VITE_APP_VERSION ?? '1.0.0';

onMounted(() => {
  // opcional: recordar email
  const saved = localStorage.getItem('login_email');
  if (saved) email.value = saved;
});

const submit = async () => {
  error.value = null;
  loading.value = true;
  try {
    await auth.login(email.value, password.value);

    if (remember.value) localStorage.setItem('login_email', email.value);
    else localStorage.removeItem('login_email');

    r.push('/');
  } catch (e: any) {
    // intenta mostrar el mensaje real si viene del backend
    error.value = e?.response?.data?.error || 'Error de acceso. Verifica tus credenciales.';
    console.error(e);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.label { @apply block text-sm font-medium text-gray-700 mb-1; }

.input {
  @apply border border-gray-200 rounded-xl w-full
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600
  placeholder:text-gray-400 bg-white;
}

/* 👇 padding cuando hay icono a la izquierda */
.input-icon {
  @apply py-2 pl-11 pr-3;
}

/* 👇 password además deja espacio para el botón de la derecha */
.input-pass {
  @apply py-2 pl-11 pr-24;
}

.left-icon {
  @apply absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none;
}

.right-btn {
  @apply absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg
  hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed;
}

.btn {
  @apply bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium
  hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

</style>

