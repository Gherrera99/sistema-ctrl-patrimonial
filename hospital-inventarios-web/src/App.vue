<!-- src/App.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <nav
        v-if="auth.ready && auth.user"
        class="sticky top-0 z-40 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70"
    >
      <!-- ✅ FULL WIDTH (sin max-w centrado) -->
      <div class="w-full px-6">
        <div class="flex h-16 items-center">
          <!-- LEFT: Brand -->
          <div class="flex flex-1 items-center gap-3">
            <div class="h-10 w-10 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2">
                <path d="M12 2a7 7 0 0 1 7 7v3a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V9a7 7 0 0 1 7-7Z" />
                <path d="M8 16v2a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2" />
              </svg>
            </div>

            <div class="leading-tight">
              <h1 class="text-sm md:text-base font-semibold text-gray-900">
                Registro y Control de Bienes
              </h1>
              <p class="hidden md:block text-xs text-gray-500">
                Hospital de la Amistad • Sistema de Control Patrimonial
              </p>
            </div>
          </div>

          <!-- CENTER: Links (desktop) -->
          <div class="hidden md:flex flex-1 items-center justify-center gap-2">
            <RouterLink class="navlink" to="/">Inventario</RouterLink>
            <RouterLink class="navlink" to="/ubicaciones">Ubicaciones</RouterLink>
            <RouterLink class="navlink" to="/personal">Personal</RouterLink>
            <RouterLink v-if="auth.isAdmin" class="navlink" to="/autoridades">Autorizadores</RouterLink>
            <RouterLink v-if="auth.can('proveedores:read')" class="navlink" to="/proveedores">Proveedores</RouterLink>
            <RouterLink v-if="auth.isAdmin" class="navlink" to="/admin/usuarios">Usuarios</RouterLink>
            <RouterLink v-if="auth.can('dictamen:read')" class="navlink" to="/dictamenes">Dictámenes</RouterLink>
            <RouterLink
                v-if="auth.isAdmin"
                class="navlink"
                to="/importar-inventario"
            >
              Importar Excel
            </RouterLink>
          </div>

          <!-- RIGHT: Profile + Mobile -->
          <div class="flex flex-1 items-center justify-end gap-2">
            <!-- ✅ Profile dropdown wrapper con ref para click-outside -->
            <div ref="profileWrap" class="relative">
              <button
                  class="profilebtn"
                  type="button"
                  @click.stop="toggleProfile"
                  aria-label="Abrir menú de usuario"
              >
                <div class="h-8 w-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-semibold">
                  {{ initials }}
                </div>

                <div class="hidden sm:block text-left leading-tight">
                  <div class="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                    {{ auth.user?.name || auth.user?.email || 'Usuario' }}
                  </div>
                  <div class="mt-0.5 flex items-center gap-2">
                    <span :class="badgeClass">{{ prettyRole }}</span>
                  </div>
                </div>

                <svg class="hidden sm:block h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <!-- Dropdown -->
              <div v-if="profileOpen" class="dropdown" @click.stop>
                <div class="px-3 py-2">
                  <div class="text-sm font-semibold text-gray-900 truncate">
                    {{ auth.user?.name || 'Usuario' }}
                  </div>
                  <div class="text-xs text-gray-500 truncate">
                    {{ auth.user?.email }}
                  </div>
                  <div class="mt-2">
                    <span :class="badgeClass">{{ prettyRole }}</span>
                  </div>
                </div>

                <div class="border-t my-1"></div>

                <!-- Links dentro del dropdown (opcional, se ve bien en móvil) -->
                <div class="px-1 py-1 md:hidden">
                  <RouterLink class="ddlink" to="/" @click="closeAll">Inventario</RouterLink>
                  <RouterLink class="ddlink" to="/ubicaciones" @click="closeAll">Ubicaciones</RouterLink>
                  <RouterLink class="ddlink" to="/personal" @click="closeAll">Personal</RouterLink>
                  <RouterLink v-if="auth.isAdmin" class="ddlink" to="/autoridades" @click="closeAll">Autorizadores</RouterLink>
                  <RouterLink v-if="auth.can('proveedores:read')" class="ddlink" to="/proveedores" @click="closeAll">Proveedores</RouterLink>
                  <RouterLink v-if="auth.isAdmin" class="ddlink" to="/admin/usuarios" @click="closeAll">Usuarios</RouterLink>
                  <RouterLink v-if="auth.can('dictamen:read')" class="ddlink" to="/dictamenes" @click="closeAll">Dictámenes</RouterLink>
                  <RouterLink
                      v-if="auth.isAdmin || auth.user?.role === 'CONTROL_PATRIMONIAL'"
                      class="ddlink"
                      to="/importar-inventario"
                      @click="closeAll"
                  >
                    Importar Excel
                  </RouterLink>
                </div>

                <div class="border-t my-1"></div>

                <div class="px-1 pb-1">
                  <button class="dddanger" type="button" @click="logout">
                    <span>Salir</span>
                    <span class="text-xs opacity-70">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- ✅ Hamburguesa SOLO móvil (y ya no se rompe por CSS) -->
            <button
                class="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border bg-white hover:bg-gray-50 transition
                     focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                type="button"
                @click="mobileOpen = !mobileOpen"
                aria-label="Abrir menú"
            >
              <svg v-if="!mobileOpen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile menu (links) -->
        <div v-if="mobileOpen" class="md:hidden pb-3">
          <div class="mt-2 grid gap-2 rounded-2xl border bg-white p-3 shadow-sm">
            <RouterLink class="navlink-mobile" to="/" @click="mobileOpen=false">Inventario</RouterLink>
            <RouterLink class="navlink-mobile" to="/ubicaciones" @click="mobileOpen=false">Ubicaciones</RouterLink>
            <RouterLink class="navlink-mobile" to="/personal" @click="mobileOpen=false">Personal</RouterLink>
            <RouterLink v-if="auth.isAdmin" class="navlink-mobile" to="/autoridades" @click="mobileOpen=false">Autorizadores</RouterLink>
            <RouterLink v-if="auth.can('proveedores:read')" class="navlink-mobile" to="/proveedores" @click="mobileOpen=false">Proveedores</RouterLink>
            <RouterLink v-if="auth.isAdmin" class="navlink-mobile" to="/admin/usuarios" @click="mobileOpen=false">Usuarios</RouterLink>
            <RouterLink v-if="auth.can('dictamen:read')" class="navlink-mobile" to="/dictamenes" @click="mobileOpen=false">Dictámenes</RouterLink>
            <RouterLink
                v-if="auth.isAdmin || auth.user?.role === 'CONTROL_PATRIMONIAL'"
                class="navlink"
                to="/importar-inventario"
            >
              Importar Excel
            </RouterLink>

          </div>
        </div>
      </div>
    </nav>

    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from './stores/auth';

const auth = useAuth();
const route = useRoute();

const mobileOpen = ref(false);
const profileOpen = ref(false);
const profileWrap = ref<HTMLElement | null>(null);

watch(() => route.fullPath, () => closeAll());

function closeAll() {
  mobileOpen.value = false;
  profileOpen.value = false;
}

function toggleProfile() {
  profileOpen.value = !profileOpen.value;
  if (profileOpen.value) mobileOpen.value = false;
}

/**
 * ✅ Click-outside REAL:
 * - Si clicas dentro del wrapper del perfil, NO cierres.
 * - Si clicas afuera, cierra dropdown.
 * Usamos pointerdown para evitar “se abre y se cierra” en el mismo click.
 */
function onPointerDown(e: PointerEvent) {
  const el = profileWrap.value;
  const target = e.target as Node | null;
  if (!el || !target) return;
  if (el.contains(target)) return; // click dentro => no cerrar
  profileOpen.value = false; // click fuera => cerrar
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown));

const logout = async () => {
  try { await auth.logout(); location.href = '/login'; } catch {}
};

const initials = computed(() => {
  const s = (auth.user?.name || auth.user?.email || 'U').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});

const roleKey = computed(() => String((auth.user as any)?.role || '').toUpperCase());

const prettyRole = computed(() => {
  const map: Record<string, string> = {
    ADMIN: 'Administrador',
    COLABORADOR: 'Colaborador',
    CONTROL_PATRIMONIAL: 'Control Patrimonial',
    AUXILIAR_PATRIMONIAL: 'Auxiliar Patrimonial',
    MANTENIMIENTO: 'Mantenimiento',
    TECNOLOGIAS: 'Tecnologías',
  };
  return map[roleKey.value] || roleKey.value || '—';
});

const badgeClass = computed(() => {
  const r = roleKey.value;

  if (r === 'ADMIN') return 'badge badge-admin';
  if (r === 'CONTROL_PATRIMONIAL') return 'badge badge-control';
  if (r === 'AUXILIAR_PATRIMONIAL') return 'badge badge-aux';
  if (r === 'MANTENIMIENTO') return 'badge badge-mant';
  if (r === 'TECNOLOGIAS') return 'badge badge-tech';

  return 'badge badge-colab';
});

</script>

<style scoped>
.navlink {
  @apply px-3 py-2 rounded-xl text-sm font-medium text-gray-700
  hover:bg-green-50 hover:text-green-800 transition;
}
.navlink.router-link-active { @apply bg-green-100 text-green-900; }

.navlink-mobile {
  @apply px-3 py-2 rounded-xl text-sm font-medium text-gray-700
  hover:bg-green-50 hover:text-green-800 transition;
}
.navlink-mobile.router-link-active { @apply bg-green-100 text-green-900; }

/* ✅ Perfil: aquí sí está bien usar inline-flex */
.profilebtn {
  @apply inline-flex items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 shadow-sm
  hover:bg-gray-50 transition
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2;
}

/* Dropdown */
.dropdown {
  @apply absolute right-0 mt-2 w-72 rounded-2xl border bg-white shadow-lg z-50 overflow-hidden;
}
.ddlink {
  @apply flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm text-gray-700
  hover:bg-gray-50 transition;
}
.dddanger {
  @apply w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm
  text-red-700 hover:bg-red-50 transition;
}

/* Badges */
.badge { @apply inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border; }
.badge-admin { @apply bg-red-50 text-red-700 border-red-200; }
.badge-control { @apply bg-blue-50 text-blue-700 border-blue-200; }
.badge-coord { @apply bg-amber-50 text-amber-800 border-amber-200; }
.badge-dir { @apply bg-purple-50 text-purple-700 border-purple-200; }
.badge-colab { @apply bg-green-50 text-green-700 border-green-200; }
.badge-aux { @apply bg-indigo-50 text-indigo-700 border-indigo-200; }
.badge-mant { @apply bg-gray-50 text-gray-700 border-gray-200; }
.badge-tech { @apply bg-emerald-50 text-emerald-700 border-emerald-200; }

</style>
