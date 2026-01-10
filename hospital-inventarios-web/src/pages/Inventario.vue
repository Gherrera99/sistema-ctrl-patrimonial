<!-- hospital-inventarios-web/src/pages/Inventario.vue -->
<template>
  <div class="p-4 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-xl font-semibold">Inventario</h2>
        <p class="text-sm text-gray-500">
          Selecciona un bien para abrir su detalle en una ventana (modal). Control de flujo BORRADOR/ACTIVO.
        </p>
      </div>

      <div class="flex gap-2">
        <button class="btn-secondary" type="button" @click="exportar" :disabled="loadingList">
          Exportar CSV
        </button>
        <router-link to="/nuevo" class="btn">Nuevo bien</router-link>
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
      <!-- tabs estadoLogico -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <button class="tab" :class="tabEstado==='ACTIVO' ? 'tab-on':''" @click="setEstado('ACTIVO')">Activo</button>
          <button class="tab" :class="tabEstado==='BORRADOR' ? 'tab-on':''" @click="setEstado('BORRADOR')">Borrador</button>
          <button class="tab" :class="tabEstado==='BAJA' ? 'tab-on':''" @click="setEstado('BAJA')">Baja</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
              class="input md:col-span-2"
              v-model.trim="f.q"
              placeholder="Buscar (inventario / nombre / responsable)"
              @keydown.enter="aplicarFiltros"
          />

          <input
              class="input"
              v-model.trim="f.responsable"
              placeholder="Responsable (filtro)"
              @keydown.enter="aplicarFiltros"
          />

          <select class="input" v-model="f.ubicacionId">
            <option value="">Ubicación (todas)</option>
            <option v-for="u in ubicaciones" :key="u.id" :value="String(u.id)">{{ u.nombre }}</option>
          </select>

          <select class="input" v-model="f.estadoId">
            <option value="">Estado físico (todos)</option>
            <option v-for="e in estados" :key="e.id" :value="String(e.id)">{{ e.label }}</option>
          </select>

          <select class="input" v-model="f.tipo">
            <option value="">Tipo bien (todos)</option>
            <option value="ADMINISTRATIVO">Administrativo</option>
            <option value="MEDICO">Médico</option>
          </select>

          <select class="input" v-model="f.categoria">
            <option value="">Categoría (todas)</option>
            <option value="GENERAL">General</option>
            <option value="INFORMATICA">Informática</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button class="btn-secondary" @click="aplicarFiltros" :disabled="loadingList">
            {{ loadingList ? '...' : 'Buscar' }}
          </button>
          <button class="btn-secondary" type="button" @click="limpiarFiltros" :disabled="loadingList">
            Limpiar
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

        <button class="btn-secondary" @click="aplicarFiltros" :disabled="loadingList">
          Recargar
        </button>
      </div>

      <div class="border-t">
        <div v-if="loadingList" class="p-4 text-sm text-gray-500">Cargando...</div>

        <div v-else-if="!list.length" class="p-4 text-sm text-gray-500">
          No hay bienes en este estado.
        </div>

        <div v-else class="max-h-[70vh] overflow-auto">
          <button
              v-for="it in list"
              :key="it.id"
              class="w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50"
              @click="openDetail(it.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium">
                  {{ it.no_inventario }} — {{ it.nombre }}
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  Resp: {{ it.responsable || '-' }}
                  <span class="text-gray-400">·</span>
                  Ubic: {{ it.ubicacion?.nombre || '-' }}
                  <span class="text-gray-400">·</span>
                  Estado: {{ it.estado?.label || '-' }}
                  <span class="text-gray-400">·</span>
                  Tipo: {{ it.tipo ?? it.tipo_bien ?? '-' }}
                  <span v-if="it.categoria" class="text-gray-400">·</span>
                  <span v-if="it.categoria">Cat: {{ it.categoria }}</span>
                </div>
              </div>

              <span class="badge" :class="badgeClass(it.estadoLogico)">
                {{ it.estadoLogico }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!--Paginador-->

    <div class="flex items-center justify-between mt-4">
      <div class="text-sm text-gray-600">
        Total: <b>{{ total }}</b> · Página <b>{{ page }}</b> de <b>{{ totalPages }}</b>
      </div>

      <div class="flex items-center gap-2">
        <select v-model.number="pageSize" class="input" @change="changePageSize">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>

        <button class="btn-secondary" :disabled="page <= 1" @click="prevPage">
          Anterior
        </button>

        <button class="btn-secondary" :disabled="page >= totalPages" @click="nextPage">
          Siguiente
        </button>
      </div>
    </div>

    <!-- ========================= -->
    <!-- MODAL: DETALLE BIEN       -->
    <!-- ========================= -->
    <div v-if="showDetail" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal">
        <!-- header modal -->
        <div class="modal-head">
          <div>
            <div class="text-sm text-gray-500">Bien</div>
            <div class="text-lg font-semibold">
              {{ item?.no_inventario }} — {{ item?.nombre }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
                class="btn-secondary"
                type="button"
                @click="openDocsModal"
                title="Factura, resguardos, cancelaciones"
            >
              Documentos / Resguardos
            </button>

            <button
                v-if="fotoHref"
                class="btn-secondary"
                type="button"
                @click="openFotoPreview()"
                title="Ver foto del bien"
            >
              Ver foto
            </button>

            <a
                v-if="item?.id"
                class="btn-secondary"
                :href="`${API}/resguardo/${item.id}?ts=${Date.now()}`"
                target="_blank"
                rel="noopener"
                title="Plantilla PDF del resguardo (según tu endpoint existente)"
            >
              Resguardo PDF
            </a>

            <button class="btn-secondary" @click="closeDetail" type="button">Cerrar</button>
          </div>
        </div>

        <!-- body modal -->
        <div class="modal-body" v-if="loadingDetail">
          <div class="p-4 text-sm text-gray-500">Cargando detalle...</div>
        </div>

        <div class="modal-body" v-else>
          <!-- Resumen -->
          <div class="grid md:grid-cols-4 gap-3 mb-4">
            <div class="card">
              <div class="text-xs text-gray-500">Estado lógico</div>
              <div class="font-medium flex items-center gap-2">
                <span class="badge" :class="badgeClass(item?.estadoLogico)">{{ item?.estadoLogico }}</span>
                <span v-if="!canEdit" class="text-xs text-gray-500">(Solo lectura)</span>
              </div>
            </div>

            <div class="card">
              <div class="text-xs text-gray-500">Ubicación</div>
              <div class="font-medium">{{ item?.ubicacion?.nombre || '-' }}</div>
            </div>

            <div class="card">
              <div class="text-xs text-gray-500">Estado físico</div>
              <div class="font-medium">{{ item?.estado?.label || '-' }}</div>
            </div>

            <div class="card">
              <div class="text-xs text-gray-500">Responsable actual</div>
              <div class="font-medium">{{ item?.responsable || '-' }}</div>
              <div class="text-xs text-gray-500">RFC: {{ item?.rfc || '-' }}</div>
            </div>
          </div>

          <!-- Datos del bien (compacto por secciones) -->
          <div class="grid md:grid-cols-2 gap-3">

            <!-- Identificación -->
            <div class="card">
              <div class="font-semibold text-sm mb-2">Identificación</div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div class="text-xs text-gray-500">No. inventario</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.no_inventario }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.no_inventario" />
                </div>

                <div>
                  <div class="text-xs text-gray-500">Tipo</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.tipo ?? '-' }}</div>
                  <select v-else class="input mt-1" v-model="form.tipo">
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                    <option value="MEDICO">MEDICO</option>
                  </select>
                </div>

                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Nombre</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.nombre }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.nombre" />
                </div>

                <div>
                  <div class="text-xs text-gray-500">Categoría</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.categoria ?? '-' }}</div>
                  <select v-else class="input mt-1" v-model="form.categoria">
                    <option value="GENERAL">GENERAL</option>
                    <option value="INFORMATICA">INFORMATICA</option>
                  </select>
                </div>

                <div>
                  <div class="text-xs text-gray-500">Clasificación</div>

                  <!-- Solo lectura -->
                  <div v-if="!editMode" class="font-medium">
                    <span v-if="item?.clasificacion">
                      {{ item.clasificacion.sigla }}
                      <span class="text-gray-500" v-if="item.clasificacion.cuenta">— {{ item.clasificacion.cuenta }}</span>
                    </span>
                    <span v-else>-</span>
                  </div>

                  <!-- Edición -->
                  <select v-else class="input mt-1" v-model="form.clasificacionId">
                    <option value="">(Sin clasificación)</option>
                    <option v-for="c in clasificaciones" :key="c.id" :value="String(c.id)">
                      {{ c.sigla }}<span v-if="c.cuenta"> — {{ c.cuenta }}</span>
                    </option>
                  </select>
                </div>

              </div>
            </div>

            <!-- Asignación -->
            <div class="card">
              <div class="font-semibold text-sm mb-2">Asignación</div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <!-- Responsable -->
                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Responsable</div>

                  <!-- ✅ BORRADOR + editMode => select -->
                  <select
                      v-if="editMode && isBorrador"
                      class="input mt-1"
                      v-model="form.personalId"
                  >
                    <option value="">(Selecciona personal)</option>
                    <option v-for="p in personal" :key="p.id" :value="String(p.id)">
                      {{ p.nombre }} — {{ p.rfc }} — {{ p.puesto }}
                    </option>
                  </select>

                  <!-- ✅ ACTIVO o solo lectura => texto -->
                  <div v-else class="font-medium">
                    {{ item?.responsable || '-' }}
                  </div>
                </div>



                <div>
                  <div class="text-xs text-gray-500">RFC</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.rfc || '-' }}</div>
                  <input
                      v-else
                      class="input mt-1"
                      :value="isBorrador ? form.rfc : (item?.rfc || '')"
                      disabled
                  />
                </div>

                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Puesto del responsable</div>
                  <div v-if="!editMode" class="font-medium">{{ puestoResponsable || '-' }}</div>
                  <input
                      v-else
                      class="input mt-1"
                      :value="isBorrador ? form.responsablePuesto : (puestoResponsable || '')"
                      disabled
                  />
                </div>


                <div>
                  <div class="text-xs text-gray-500">Estado físico</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.estado?.label || '-' }}</div>
                  <select v-else class="input mt-1" v-model="form.estadoId">
                    <option value="">(Sin estado)</option>
                    <option v-for="e in estados" :key="e.id" :value="String(e.id)">{{ e.label }}</option>
                  </select>
                </div>

                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Ubicación</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.ubicacion?.nombre || '-' }}</div>
                  <select v-else class="input mt-1" v-model="form.ubicacionId">
                    <option value="">(Sin ubicación)</option>
                    <option v-for="u in ubicaciones" :key="u.id" :value="String(u.id)">{{ u.nombre }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Adquisición -->
            <div class="card">
              <div class="font-semibold text-sm mb-2">Adquisición</div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div class="text-xs text-gray-500">Folio factura</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.no_factura || '-' }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.no_factura" placeholder="Folio / No. factura" />
                </div>

                <div>
                  <div class="text-xs text-gray-500">Costo adquisición</div>
                  <div v-if="!editMode" class="font-medium">
                    {{ item?.costo_adquisicion != null ? moneyMXN.format(Number(item.costo_adquisicion)) : '-' }}
                  </div>
                  <input v-else class="input mt-1" type="number" step="0.01" v-model="form.costo_adquisicion" placeholder="0.00" />
                </div>

                <div>
                  <div class="text-xs text-gray-500">Fecha adjudicación</div>
                  <div v-if="!editMode" class="font-medium">{{ fmtDate(item?.fecha_adjudicacion) }}</div>
                  <input v-else class="input mt-1" type="date" v-model="form.fecha_adjudicacion" />
                </div>

                <div>
                  <div class="text-xs text-gray-500">Fecha entrega</div>
                  <div v-if="!editMode" class="font-medium">{{ fmtDate(item?.fecha_entrega) }}</div>
                  <input v-else class="input mt-1" type="date" v-model="form.fecha_entrega" />
                </div>

                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Proveedor</div>
                  <div class="font-medium">
                    {{ item?.proveedor?.nombre || item?.proveedor?.razonSocial || '-' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Características -->
            <div class="card">
              <div class="font-semibold text-sm mb-2">Características</div>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div class="text-xs text-gray-500">Marca</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.marca || '-' }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.marca" />
                </div>

                <div>
                  <div class="text-xs text-gray-500">Modelo</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.modelo || '-' }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.modelo" />
                </div>

                <div class="col-span-2">
                  <div class="text-xs text-gray-500">No. serie</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.no_serie || '-' }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.no_serie" />
                </div>

                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Tipo de propiedad</div>
                  <div v-if="!editMode" class="font-medium">{{ item?.tipoPropiedad || '-' }}</div>
                  <input v-else class="input mt-1" v-model.trim="form.tipoPropiedad" placeholder="Ej. PROPIO / COMODATO / ARRENDADO" />
                </div>

                <!-- FOTO               -->
                <div class="col-span-2">
                  <div class="text-xs text-gray-500">Foto</div>

                  <!-- ✅ input para editar foto -->
                  <div v-if="editMode" class="mt-2">
                    <input
                        class="input"
                        v-model.trim="form.fotoUrl"
                        placeholder="URL de la foto (Drive/URL directa)"
                    />
                    <p class="text-xs text-gray-500 mt-1">Pega una URL directa (termina en .jpg/.png) para vista previa.</p>
                  </div>

                  <div v-if="fotoHref" class="mt-1 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        class="btn-secondary btn-mini"
                        @click="openFotoPreview()"
                        :disabled="!fotoPreviewUrl"
                        title="Vista previa"
                    >
                      Vista previa
                    </button>

                    <a
                        class="btn-secondary btn-mini"
                        :href="fotoHref"
                        target="_blank"
                        rel="noopener"
                        title="Abrir enlace"
                    >
                      Abrir enlace
                    </a>

                    <span class="text-xs text-gray-500 break-all">
                      {{ prettyUrl(fotoHref) }}
                    </span>
                  </div>

                  <div v-else class="font-medium">-</div>

                  <!-- thumbnail -->
                  <div v-if="fotoPreviewUrl && !fotoPreviewError" class="mt-3">
                    <div class="inline-block rounded-xl border bg-white p-2">
                      <img
                          :src="fotoPreviewUrl"
                          alt="Foto del bien"
                          class="h-24 w-auto rounded-lg object-cover cursor-zoom-in shadow-sm"
                          @click="openFotoPreview()"
                          @error="fotoPreviewError = true"
                      />
                    </div>
                  </div>

                  <div v-else-if="fotoHref" class="mt-2 text-xs text-gray-500">
                    No se pudo generar vista previa. (Revisa permisos del Drive o usa URL directa de imagen)
                  </div>
                </div>

              </div>
            </div>

            <!-- Observaciones -->
            <div class="card md:col-span-2">
              <div class="text-xs text-gray-500">Observaciones</div>
              <div v-if="!editMode" class="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
                {{ item?.observaciones || '-' }}
              </div>
              <textarea v-else class="input min-h-[110px] mt-2" v-model.trim="form.observaciones" />
            </div>
          </div>

          <!-- Resguardo activo (compacto) -->
          <div class="card mt-4">
            <div class="font-semibold text-sm mb-2">Resguardo activo</div>

            <div v-if="!resguardoActivo" class="text-sm text-gray-500">
              No hay resguardo ACTIVO.
            </div>

            <div v-else class="grid md:grid-cols-3 gap-3 text-sm">
              <div>
                <div class="text-xs text-gray-500">ID</div>
                <div class="font-medium">#{{ resguardoActivo.id }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Responsable</div>
                <div class="font-medium">{{ resguardoActivo.responsable }}</div>
                <div class="text-xs text-gray-500">RFC: {{ resguardoActivo.rfc || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Ubicación</div>
                <div class="font-medium">{{ resguardoActivo.ubicacion?.nombre || item?.ubicacion?.nombre || '-' }}</div>
              </div>

              <div class="md:col-span-3">
                <div class="text-xs text-gray-500 mb-1">Archivos del resguardo</div>

                <div v-if="!(resguardoActivo.archivos || []).length" class="text-sm text-gray-500">
                  Sin archivos.
                </div>

                <div v-else class="flex flex-wrap gap-2">
                  <a
                      v-for="a in resguardoActivo.archivos"
                      :key="a.id"
                      class="inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
                      :href="a.filePath"
                      target="_blank"
                      rel="noopener"
                  >
                    <span class="badge badge-gray">{{ a.tipo }}</span>
                    <span class="text-green-700">{{ a.nombre }}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Movimientos -->
          <div class="card mt-4">
            <div class="font-semibold text-sm mb-2">Movimientos</div>

            <div v-if="!item?.movimientos?.length" class="text-sm text-gray-500">Sin movimientos.</div>

            <div v-else class="max-h-[220px] overflow-auto border rounded">
              <div
                  v-for="m in item.movimientos"
                  :key="m.id"
                  class="p-3 border-b last:border-b-0 text-sm"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="font-medium">{{ m.tipo }}</div>
                  <div class="text-xs text-gray-500">
                    {{ m.createdAt ? String(m.createdAt).slice(0,19).replace('T',' ') : '-' }}
                  </div>
                </div>
                <div class="text-gray-700 mt-1">{{ m.motivo }}</div>
                <div class="text-xs text-gray-500 mt-1" v-if="m.responsableAntes || m.responsableDespues || m.ubicacionAntes || m.ubicacionDespues">
                  <span v-if="m.responsableAntes || m.responsableDespues">
                    Resp: {{ m.responsableAntes || '-' }} → {{ m.responsableDespues || '-' }}
                  </span>
                  <span v-if="(m.responsableAntes || m.responsableDespues) && (m.ubicacionAntes || m.ubicacionDespues)" class="text-gray-400"> · </span>
                  <span v-if="m.ubicacionAntes || m.ubicacionDespues">
                    Ubic: {{ m.ubicacionAntes || '-' }} → {{ m.ubicacionDespues || '-' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex flex-wrap gap-2 mt-4">
            <button v-if="canEdit && !editMode" class="btn" type="button" @click="enableEdit">
              Editar
            </button>

            <button v-if="editMode" class="btn" type="button" @click="guardar" :disabled="loadingSave">
              {{ loadingSave ? 'Guardando...' : 'Guardar cambios' }}
            </button>

            <button v-if="editMode" class="btn-secondary" type="button" @click="cancelEdit">
              Cancelar edición
            </button>

            <button
                v-if="canDelete"
                class="btn-secondary"
                type="button"
                @click="eliminarItem"
                :disabled="loadingDelete"
                title="Solo ADMIN y solo si el bien está en BORRADOR"
            >
              {{ loadingDelete ? 'Eliminando...' : 'Eliminar (ADMIN)' }}
            </button>
          </div>

          <!-- Visor de foto -->
          <div
              v-if="showFotoPreview"
              class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
              @click.self="showFotoPreview = false"
          >
            <div class="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
              <div class="flex items-center justify-between gap-3 border-b bg-white p-3">
                <div>
                  <div class="text-sm font-semibold text-gray-900">Foto del bien</div>
                  <div class="text-xs text-gray-500">
                    {{ item?.no_inventario }} — {{ item?.nombre }}
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <a
                      v-if="fotoHref"
                      class="btn-secondary"
                      :href="fotoHref"
                      target="_blank"
                      rel="noopener"
                  >
                    Abrir en pestaña
                  </a>
                  <button class="btn-secondary" type="button" @click="showFotoPreview = false">
                    Cerrar
                  </button>
                </div>
              </div>

              <div class="bg-gray-50 p-4">
                <div v-if="fotoPreviewUrl && !fotoPreviewError" class="flex justify-center">
                  <img
                      :src="fotoPreviewUrl"
                      alt="Foto del bien"
                      class="max-h-[72vh] w-auto rounded-xl shadow"
                      @error="fotoPreviewError = true"
                  />
                </div>

                <div v-else class="text-sm text-gray-600">
                  No se pudo mostrar la imagen aquí. Usa “Abrir en pestaña” para verla.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Modal Documentos/Resguardos -->
    <div v-if="showDocsModal" class="modal-backdrop" @click.self="closeDocsModal">
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="text-sm text-gray-500">Documentos</div>
            <div class="text-lg font-semibold">
              {{ item?.no_inventario }} — {{ item?.nombre }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn-secondary" @click="closeDocsModal" type="button">Cerrar</button>
          </div>
        </div>

        <div class="modal-body">
          <!-- AQUÍ pegas tal cual tus bloques existentes -->
          <!-- 1) Archivos del bien (FACTURA) -->
          <!-- Archivos del bien -->
          <div class="card mt-4">
            <div class="font-semibold text-sm mb-2">Archivos del bien</div>

            <div class="text-sm text-gray-600 mb-3">
              Aquí se carga la <b>FACTURA</b>. (Se requiere para “Subir al inventario”)
            </div>

            <div class="flex flex-col md:flex-row md:items-center gap-2">
              <input type="file" class="file-input flex-1" accept=".pdf,image/*" @change="onFactura" />
              <button
                  class="btn-secondary shrink-0"
                  type="button"
                  @click="subirFactura"
                  :disabled="!fileFactura || loadingFactura || !canUploadDocs"
              >
                {{ loadingFactura ? 'Subiendo...' : 'Subir FACTURA' }}
              </button>
            </div>

            <div class="mt-3" v-if="(item?.archivos || []).length">
              <div class="text-xs text-gray-500 mb-1">Archivos registrados:</div>
              <div class="space-y-1">
                <div v-for="a in item.archivos" :key="a.id" class="text-sm">
                  <span class="badge badge-gray mr-2">{{ a.tipo }}</span>
                  <a class="text-green-700 hover:underline" :href="a.filePath" target="_blank" rel="noopener">
                    {{ a.nombre }}
                  </a>
                </div>
              </div>
            </div>
            <div class="mt-3 text-sm text-gray-500" v-else>
              Sin archivos aún.
            </div>
          </div>
          <!-- 2) Resguardos (firmado / subir / cancelación / historial) -->
          <!-- Resguardos -->
          <div class="card mt-4">
            <div class="font-semibold text-sm mb-2">Resguardos (historial)</div>

            <div class="text-sm text-gray-600 mb-3">
              Flujo:
              <b>BORRADOR</b> → subir <b>RESGUARDO_FIRMADO</b> → “Subir al inventario” (ACTIVO).
              Para cambio de responsable: subir <b>RESGUARDO_CANCELADO</b> al resguardo ACTIVO → cancelar → crear nuevo BORRADOR.
            </div>

            <!-- Subir resguardo firmado (sobre BORRADOR actual) -->
            <div class="border rounded p-3 bg-gray-50 mb-3">
              <div class="font-semibold text-sm">Resguardo firmado</div>
              <div class="text-xs text-gray-500 mb-2">
                Sube el escaneado <b>RESGUARDO_FIRMADO</b> al resguardo BORRADOR actual.
              </div>

              <div class="flex flex-col md:flex-row md:items-center gap-2">
                <input type="file" class="file-input flex-1" accept=".pdf,image/*" @change="onResguardoFirmado" />
                <button
                    class="btn-secondary shrink-0"
                    type="button"
                    @click="subirResguardoFirmado"
                    :disabled="!fileResguardoFirmado || loadingResguardoFirmado || !canUploadDocs"
                >
                  {{ loadingResguardoFirmado ? 'Subiendo...' : 'Subir RESGUARDO_FIRMADO' }}
                </button>
              </div>

              <div class="mt-2 text-sm">
                BORRADOR actual:
                <span class="font-medium">
                  {{ resguardoBorrador ? `#${resguardoBorrador.id}` : 'No encontrado' }}
                </span>
                <span class="text-gray-400">·</span>
                Firmado cargado:
                <span class="font-medium">{{ tieneResguardoFirmado ? 'Sí' : 'No' }}</span>
              </div>
            </div>

            <!-- Subir al inventario (BORRADOR -> ACTIVO) -->
            <div class="flex flex-wrap gap-2 mb-3">
              <button
                  v-if="item?.estadoLogico === 'BORRADOR'"
                  class="btn"
                  type="button"
                  @click="subirAlInventario"
                  :disabled="loadingSubir || !canSubirAlInventario"
                  title="Requiere FACTURA + RESGUARDO_FIRMADO"
              >
                {{ loadingSubir ? 'Subiendo...' : 'Subir al inventario (ACTIVO)' }}
              </button>

              <div v-if="item?.estadoLogico === 'BORRADOR'" class="text-sm text-gray-600 flex items-center">
                Requisitos:
                <span class="ml-2 badge" :class="tieneFactura ? 'badge-green' : 'badge-red'">FACTURA</span>
                <span class="ml-2 badge" :class="tieneResguardoFirmado ? 'badge-green' : 'badge-red'">RESGUARDO_FIRMADO</span>
              </div>
            </div>

            <!-- Cancelación de resguardo (solo ACTIVO + admin/control) -->
            <div v-if="item?.estadoLogico === 'ACTIVO' && canCancelResguardo" class="border rounded p-3 bg-gray-50">
              <div class="font-semibold text-sm">Cancelar resguardo ACTIVO (nuevo responsable)</div>
              <div class="text-xs text-gray-500 mb-2">
                Primero sube el escaneado <b>RESGUARDO_CANCELADO</b> al resguardo ACTIVO. Luego podrás cancelar y crear el nuevo BORRADOR.
              </div>

              <div class="flex flex-col md:flex-row md:items-center gap-2">
                <input type="file" class="file-input flex-1" accept=".pdf,image/*" @change="onResguardoCancelado" />
                <button
                    class="btn-secondary shrink-0"
                    type="button"
                    @click="subirResguardoCancelado"
                    :disabled="!fileResguardoCancelado || loadingResguardoCancelado"
                >
                  {{ loadingResguardoCancelado ? 'Subiendo...' : 'Subir RESGUARDO_CANCELADO' }}
                </button>
              </div>

              <div class="mt-2 text-sm">
                Resguardo ACTIVO:
                <span class="font-medium">
                  {{ resguardoActivo ? `#${resguardoActivo.id}` : 'No encontrado' }}
                </span>
                <span class="text-gray-400">·</span>
                Cancelado cargado:
                <span class="font-medium">{{ tieneResguardoCancelado ? 'Sí' : 'No' }}</span>
              </div>

              <!-- Form nuevo resguardo -->
              <div class="grid md:grid-cols-4 gap-2 mt-3">
                <div>
                  <label class="label">Responsable nuevo (catálogo)</label>
                  <select class="input" v-model="cancelForm.personalIdNuevo">
                    <option value="">(Selecciona personal)</option>
                    <option v-for="p in personal" :key="p.id" :value="String(p.id)">
                      {{ p.nombre }} — {{ p.rfc }} — {{ p.puesto }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="label">RFC nuevo</label>
                  <input class="input" :value="cancelForm.rfcNuevo" disabled />
                </div>

                <div>
                  <label class="label">Puesto</label>
                  <input class="input" :value="cancelForm.puestoNuevo" disabled />
                </div>

                <div>
                  <label class="label">Ubicación nueva (opcional)</label>
                  <select class="input" v-model="cancelForm.ubicacionIdNuevo">
                    <option value="">(Sin cambio)</option>
                    <option v-for="u in ubicaciones" :key="u.id" :value="String(u.id)">{{ u.nombre }}</option>
                  </select>
                </div>
              </div>


              <div class="mt-3 flex gap-2">
                <button
                    class="btn"
                    type="button"
                    @click="cancelarResguardo"
                    :disabled="loadingCancelarResguardo || !tieneResguardoCancelado"
                    title="Requiere RESGUARDO_CANCELADO"
                >
                  {{ loadingCancelarResguardo ? 'Procesando...' : 'Cancelar resguardo y crear nuevo BORRADOR' }}
                </button>
              </div>
            </div>

            <!-- Lista historial -->
            <div class="mt-4">
              <div v-if="!item?.resguardos?.length" class="text-sm text-gray-500">Sin resguardos registrados.</div>

              <div v-else class="space-y-2">
                <div
                    v-for="r in item.resguardos"
                    :key="r.id"
                    class="border rounded p-3"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="font-medium">
                        Resguardo #{{ r.id }} — {{ r.responsable }}
                      </div>
                      <div class="text-xs text-gray-500">
                        Estado: {{ r.estado }} · Creado: {{ r.createdAt ? String(r.createdAt).slice(0,10) : '-' }}
                        <span v-if="r.ubicacion?.nombre" class="text-gray-400">·</span>
                        <span v-if="r.ubicacion?.nombre">Ubic: {{ r.ubicacion.nombre }}</span>
                      </div>
                    </div>
                    <span class="badge" :class="resguardoBadge(r.estado)">{{ r.estado }}</span>
                  </div>

                  <div class="mt-2" v-if="(r.archivos || []).length">
                    <div class="text-xs text-gray-500 mb-1">Archivos del resguardo:</div>
                    <div class="space-y-1">
                      <div v-for="a in r.archivos" :key="a.id" class="text-sm">
                        <span class="badge badge-gray mr-2">{{ a.tipo }}</span>
                        <a class="text-green-700 hover:underline" :href="a.filePath" target="_blank" rel="noopener">
                          {{ a.nombre }}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div class="mt-2 text-sm text-gray-500" v-else>
                    Sin archivos.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Tip: si quieres, deja el historial de resguardos aquí también -->
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';

axios.defaults.withCredentials = true;

const API = '/api';
const route = useRoute();
const router = useRouter();

const showDocsModal = ref(false);
const error = ref('');
const success = ref('');
function clearMessages() { error.value = ''; success.value = ''; }

const auth = useAuth();

const myRole = computed(() => String(auth.user?.role || ''));
const myUserId = computed(() => (auth.user?.id ? Number(auth.user.id) : null));
const isAdmin = computed(() => myRole.value === 'ADMIN');
const isControl = computed(() => myRole.value === 'CONTROL_PATRIMONIAL');
const isAuxControl = computed(() => myRole.value === 'AUXILIAR_PATRIMONIAL');
const isBorrador = computed(() => String(item.value?.estadoLogico || '').toUpperCase() === 'BORRADOR');


const openingId = ref<number | null>(null);

const moneyMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const fmtDate = (v?: any) => (v ? String(v).slice(0, 10) : '-');

// listado
const list = ref<any[]>([]);
const loadingList = ref(false);
const tabEstado = ref<'ACTIVO'|'BORRADOR'|'EN_DICTAMEN'|'BAJA'>('ACTIVO');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const totalPages = ref(1);

// catálogos
const ubicaciones = ref<any[]>([]);
const estados = ref<any[]>([]);
const clasificaciones = ref<any[]>([]);

type Personal = { id:number; nombre:string; rfc:string; puesto:string };

const personal = ref<Personal[]>([]);

async function cargarPersonal() {
  try {
    const { data } = await axios.get<Personal[]>(`${API}/personal`);
    personal.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('No se pudo cargar /api/personal', err);
    personal.value = [];
  }
}



// filtros (alineados al backend)
const f = reactive({
  q: '',
  responsable: '',
  ubicacionId: '',
  estadoId: '',
  tipo: '',
  categoria: '',
});

// modal detalle
const showDetail = ref(false);
const loadingDetail = ref(false);
const item = ref<any | null>(null);

const editMode = ref(false);
const loadingSave = ref(false);
const loadingDelete = ref(false);

const form = reactive({
  no_inventario: '',
  nombre: '',
  responsable: '',
  rfc: '',
  personalId: '' as string,          // guardamos string para v-model con select
  responsablePuesto: '',
  tipo: 'ADMINISTRATIVO',
  categoria: 'GENERAL',
  ubicacionId: '',
  estadoId: '',
  clasificacionId: '',
  fotoUrl: '',
  no_factura: '',
  costo_adquisicion: '',
  marca: '',
  modelo: '',
  no_serie: '',
  tipoPropiedad: '',
  fecha_adjudicacion: '',
  fecha_entrega: '',
  observaciones: '',
});

const estadoItem = computed(() => String(item.value?.estadoLogico || '').toUpperCase());

const canEditResponsableUI = computed(() => {
  // ✅ solo se permite seleccionar personal desde edición cuando el BIEN está en BORRADOR
  return estadoItem.value === 'BORRADOR';
});

const puestoResponsable = computed(() => {
  // ✅ Si no hay ACTIVO (caso “cancelar resguardo”), usa BORRADOR
  const r = resguardoActivo.value || resguardoBorrador.value;
  return (r?.responsablePuesto || r?.personal?.puesto || '').trim();
});




const showFotoPreview = ref(false);
const fotoPreviewError = ref(false);

function isProbablyUrl(v: string) {
  try { new URL(v); return true; } catch { return false; }
}

function driveFileId(raw: string) {
  const s = (raw || "").trim();
  if (!s) return "";

  const m1 = s.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m1?.[1]) return m1[1];

  const m2 = s.match(/[?&]id=([^&]+)/i);
  if (s.includes("drive.google.com") && m2?.[1]) return m2[1];

  return "";
}

function drivePreviewUrl(raw: string) {
  const id = driveFileId(raw);
  if (!id) return "";
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
}

/** ✅ fuente única:
 * - editMode = usa form.fotoUrl
 * - no editMode = usa item.fotoUrl
 */
const currentFoto = computed(() =>
    String((editMode.value ? form.fotoUrl : item.value?.fotoUrl) ?? "").trim()
);

const fotoHref = computed(() => {
  const raw = currentFoto.value;
  if (!raw) return '';
  if (raw.startsWith('/')) return raw; // ✅ ruta relativa (api/uploads)
  return isProbablyUrl(raw) ? raw : '';
});


const fotoPreviewUrl = computed(() => {
  const raw = fotoHref.value;
  if (!raw) return "";

  const id = driveFileId(raw);
  if (id) return drivePreviewUrl(raw);

  const lower = raw.toLowerCase();
  if (
      lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
      lower.endsWith(".webp") || lower.endsWith(".gif")
  ) {
    return raw;
  }

  return "";
});

function openFotoPreview() {
  if (!fotoHref.value) return;

  fotoPreviewError.value = false;

  if (!fotoPreviewUrl.value) {
    window.open(fotoHref.value, "_blank", "noopener,noreferrer");
    return;
  }

  showFotoPreview.value = true;
}

function prettyUrl(u: string) {
  try {
    const url = new URL(u);
    const path = url.pathname.length > 40 ? url.pathname.slice(0, 40) + "…" : url.pathname;
    return `${url.hostname}${path}`;
  } catch {
    return u;
  }
}

/** ✅ cuando cambia el URL (por editar o por cambiar item) */
watch(currentFoto, () => {
  fotoPreviewError.value = false;
  showFotoPreview.value = false;
});


function openDocsModal() { showDocsModal.value = true; }
function closeDocsModal() { showDocsModal.value = false; }

function limpiarFiltros() {
  f.q = '';
  f.responsable = '';
  f.ubicacionId = '';
  f.estadoId = '';
  f.tipo = '';
  f.categoria = '';
  cargarListado();
}

function badgeClass(estado?: string) {
  const e = String(estado || '').toUpperCase();
  if (e === 'BORRADOR') return 'badge-yellow';
  if (e === 'ACTIVO') return 'badge-green';
  if (e === 'EN_DICTAMEN') return 'badge-blue';
  if (e === 'BAJA') return 'badge-red';
  return 'badge-gray';
}

function resguardoBadge(estado?: string) {
  const e = String(estado || '').toUpperCase();
  if (e === 'BORRADOR') return 'badge-yellow';
  if (e === 'ACTIVO') return 'badge-green';
  if (e === 'CANCELADO') return 'badge-red';
  return 'badge-gray';
}

function setEstado(s: 'ACTIVO'|'BORRADOR'|'BAJA') {
  tabEstado.value = s;
  aplicarFiltros();
}

async function cargarCatalogos() {
  try {
    const [u, e, c] = await Promise.all([
      axios.get(API + '/ubicaciones'),
      axios.get(API + '/estados-fisicos'),
      axios.get(API + '/inventario/clasificaciones'),
    ]);

    ubicaciones.value = Array.isArray(u.data) ? u.data : [];
    estados.value = Array.isArray(e.data) ? e.data : [];
    clasificaciones.value = Array.isArray(c.data) ? c.data : [];
  } catch (err) {
    // no rompas la pantalla si algo falla
    console.error(err);
  }
}

async function cargarListado() {
  clearMessages();
  loadingList.value = true;

  try {
    const params: any = {
      estadoLogico: tabEstado.value,
      q: f.q.trim() || undefined,
      responsable: f.responsable.trim() || undefined,
      ubicacionId: f.ubicacionId ? Number(f.ubicacionId) : undefined,
      estadoId: f.estadoId ? Number(f.estadoId) : undefined,
      tipo: f.tipo || undefined,
      categoria: f.categoria || undefined,

      // ✅ PAGINACIÓN
      page: page.value,
      pageSize: pageSize.value,
    };

    const { data } = await axios.get(API + '/inventario', { params });

    // ✅ soporta 2 modos: array legacy o response paginado
    if (Array.isArray(data)) {
      list.value = data;
      total.value = data.length;
      totalPages.value = 1;
    } else {
      list.value = Array.isArray(data.items) ? data.items : [];
      total.value = Number(data.total || 0);
      totalPages.value = Number(data.totalPages || 1);
    }
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cargar el inventario.';
  } finally {
    loadingList.value = false;
  }
}

function aplicarFiltros() {
  page.value = 1;
  cargarListado();
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    cargarListado();
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    cargarListado();
  }
}

function changePageSize() {
  page.value = 1;
  cargarListado();
}

function fillFormFromItem(it: any) {
  form.no_inventario = it?.no_inventario || '';
  form.nombre = it?.nombre || '';
  form.responsable = it?.responsable || '';
  form.rfc = it?.rfc || '';
  form.personalId = it?.personalId ? String(it.personalId) : '';
  form.responsablePuesto = it?.responsablePuesto || '';

  form.tipo = it?.tipo || 'ADMINISTRATIVO';
  form.categoria = it?.categoria || 'GENERAL';
  form.ubicacionId = it?.ubicacionId ? String(it.ubicacionId) : '';
  form.estadoId = it?.estadoId ? String(it.estadoId) : '';
  form.clasificacionId = it?.clasificacionId ? String(it.clasificacionId) : '';
  form.fotoUrl = it?.fotoUrl ? String(it.fotoUrl) : '';

  form.no_factura = it?.no_factura || '';
  form.costo_adquisicion = it?.costo_adquisicion != null ? String(it.costo_adquisicion) : '';

  form.marca = it?.marca || '';
  form.modelo = it?.modelo || '';
  form.no_serie = it?.no_serie || '';

  form.tipoPropiedad = it?.tipoPropiedad || '';

  form.fecha_adjudicacion = it?.fecha_adjudicacion ? String(it.fecha_adjudicacion).slice(0,10) : '';
  form.fecha_entrega = it?.fecha_entrega ? String(it.fecha_entrega).slice(0,10) : '';

  form.observaciones = it?.observaciones || '';
}

const canEdit = computed(() => {
  if (!item.value?.id) return false;

  const estado = String(item.value.estadoLogico || '').toUpperCase();
  const creatorOk = myUserId.value && item.value.createdById && Number(item.value.createdById) === Number(myUserId.value);

  if (estado === 'BORRADOR') return isAdmin.value || isControl.value || isAuxControl.value || creatorOk;
  if (estado === 'ACTIVO') return isAdmin.value || isControl.value;
  return false; // EN_DICTAMEN / BAJA => no edit
});

const canUploadDocs = computed(() => {
  // mismas reglas que edición (subir docs en BORRADOR/ACTIVO según rol)
  return canEdit.value;
});

const canDelete = computed(() => {
  const estado = String(item.value?.estadoLogico || '').toUpperCase();
  const r = String(auth.user?.role || '').toUpperCase();
  return estado === 'BORRADOR' && ['ADMIN','CONTROL_PATRIMONIAL','AUXILIAR_PATRIMONIAL'].includes(r);
});

function tieneTipoArchivoBien(tipo: string) {
  const arr = item.value?.archivos || [];
  return arr.some((a: any) => String(a.tipo).toUpperCase() === String(tipo).toUpperCase());
}

const tieneFactura = computed(() => tieneTipoArchivoBien('FACTURA'));

const resguardoBorrador = computed(() => {
  const rs = item.value?.resguardos || [];
  return rs.find((r: any) => String(r.estado).toUpperCase() === 'BORRADOR') || null;
});

const resguardoActivo = computed(() => {
  const rs = item.value?.resguardos || [];
  return rs.find((r: any) => String(r.estado).toUpperCase() === 'ACTIVO') || null;
});

const tieneResguardoFirmado = computed(() => {
  const r = resguardoBorrador.value;
  if (!r) return false;
  const arr = r.archivos || [];
  return arr.some((a: any) => String(a.tipo).toUpperCase() === 'RESGUARDO_FIRMADO');
});

const tieneResguardoCancelado = computed(() => {
  const r = resguardoActivo.value;
  if (!r) return false;
  const arr = r.archivos || [];
  return arr.some((a: any) => String(a.tipo).toUpperCase() === 'RESGUARDO_CANCELADO');
});

const canSubirAlInventario = computed(() => {
  return item.value?.estadoLogico === 'BORRADOR' && canEdit.value && tieneFactura.value && tieneResguardoFirmado.value;
});

const canCancelResguardo = computed(() => {
  return item.value?.estadoLogico === 'ACTIVO' && (isAdmin.value || isControl.value);
});

async function cargarDetalle(id: number) {
  loadingDetail.value = true;
  try {
    const { data } = await axios.get(`${API}/inventario/${id}`);
    item.value = data;
    fillFormFromItem(data);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cargar el detalle.';
  } finally {
    loadingDetail.value = false;
  }
}

async function openDetail(id: number, opts: { syncRoute?: boolean } = {}) {
  const syncRoute = opts.syncRoute !== false;

  clearMessages();
  showDetail.value = true;
  editMode.value = false;
  resetUploads();

  // si ya está abierto ese mismo item, NO vuelvas a cargar
  if (item.value?.id === id) {
    // solo sincroniza URL si hace falta
    if (syncRoute && String(route.params.id || '') !== String(id)) {
      router.replace(`/inventario/${id}`);
    }
    return;
  }

  // evita llamadas simultáneas del watcher + click
  if (openingId.value === id) return;
  openingId.value = id;

  await cargarDetalle(id);

  openingId.value = null;

  // solo el click sincroniza URL (no el watcher)
  if (syncRoute && String(route.params.id || '') !== String(id)) {
    router.replace(`/inventario/${id}`);
  }
}

function closeDetail(opts: { syncRoute?: boolean } = {}) {
  const syncRoute = opts.syncRoute !== false;

  editMode.value = false;
  resetUploads();
  item.value = null;
  showDocsModal.value = false;
  showDetail.value = false;

  // solo si estás en /inventario/:id vuelve a /
  if (syncRoute && route.params.id) {
    router.replace('/');
  }
}

function enableEdit() {
  if (!canEdit.value) return;
  editMode.value = true;
}

function cancelEdit() {
  editMode.value = false;
  if (item.value) fillFormFromItem(item.value);
}

async function guardar() {
  clearMessages();
  if (!item.value?.id) return;
  if (!editMode.value) return;

  if (!form.no_inventario.trim() || !form.nombre.trim()) {
    error.value = 'No. inventario y nombre son obligatorios.';
    return;
  }

  // ✅ BORRADOR: sí requiere seleccionar personal
  if (isBorrador.value && !form.personalId) {
    error.value = 'Selecciona un responsable del catálogo.';
    return;
  }

  loadingSave.value = true;
  const costoRaw = String(form.costo_adquisicion ?? '').trim();

  try {
    // ✅ payload base (sin responsable/rfc)
    const payload: any = {
      no_inventario: form.no_inventario.trim(),
      nombre: form.nombre.trim(),

      tipo: form.tipo,
      categoria: form.categoria,
      ubicacionId: form.ubicacionId ? Number(form.ubicacionId) : null,
      estadoId: form.estadoId ? Number(form.estadoId) : null,
      clasificacionId: form.clasificacionId ? Number(form.clasificacionId) : null,
      fotoUrl: form.fotoUrl?.trim() || null,

      no_factura: form.no_factura?.trim() || null,
      costo_adquisicion: costoRaw !== '' ? Number(costoRaw) : null,

      marca: form.marca?.trim() || null,
      modelo: form.modelo?.trim() || null,
      no_serie: form.no_serie?.trim() || null,

      tipoPropiedad: form.tipoPropiedad?.trim() || null,
      fecha_adjudicacion: form.fecha_adjudicacion || null,
      fecha_entrega: form.fecha_entrega || undefined,

      observaciones: form.observaciones?.trim() || null,
    };

    // ✅ SOLO en BORRADOR mandas datos de responsable
    if (isBorrador.value) {
      payload.personalId = Number(form.personalId);
      payload.responsable = (form.responsable || '').trim();
      payload.rfc = (form.rfc || '').trim();
      payload.responsablePuesto = form.responsablePuesto || null;
    }

    await axios.put(`${API}/inventario/${item.value.id}`, payload);

    await cargarDetalle(item.value.id);
    await cargarListado();
    success.value = '✅ Cambios guardados.';
    editMode.value = false;
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo guardar.';
  } finally {
    loadingSave.value = false;
  }
}


async function eliminarItem() {
  clearMessages();
  if (!item.value?.id) return;
  if (!confirm(`¿Eliminar el bien ${item.value.no_inventario} (${item.value.nombre})?`)) return;

  loadingDelete.value = true;
  try {
    await axios.delete(`${API}/inventario/${item.value.id}`);
    success.value = '✅ Bien eliminado.';
    closeDetail();
    await cargarListado();
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo eliminar.';
  } finally {
    loadingDelete.value = false;
  }
}

// uploads
const fileFactura = ref<File | null>(null);
const fileResguardoFirmado = ref<File | null>(null);
const fileResguardoCancelado = ref<File | null>(null);

const loadingFactura = ref(false);
const loadingResguardoFirmado = ref(false);
const loadingSubir = ref(false);
const loadingResguardoCancelado = ref(false);
const loadingCancelarResguardo = ref(false);

function resetUploads() {
  fileFactura.value = null;
  fileResguardoFirmado.value = null;
  fileResguardoCancelado.value = null;
}

function onFactura(ev: any) { fileFactura.value = ev?.target?.files?.[0] || null; }
function onResguardoFirmado(ev: any) { fileResguardoFirmado.value = ev?.target?.files?.[0] || null; }
function onResguardoCancelado(ev: any) { fileResguardoCancelado.value = ev?.target?.files?.[0] || null; }

async function subirFactura() {
  clearMessages();
  if (!item.value?.id) return;
  if (!fileFactura.value) { error.value = 'Selecciona un archivo.'; return; }

  loadingFactura.value = true;
  try {
    const fd = new FormData();
    fd.append('file', fileFactura.value);

    await axios.post(`${API}/inventario/${item.value.id}/factura`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    fileFactura.value = null;
    await cargarDetalle(item.value.id);
    await cargarListado();
    success.value = '✅ Factura subida.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo subir la factura.';
  } finally {
    loadingFactura.value = false;
  }
}

async function subirResguardoFirmado() {
  clearMessages();
  if (!item.value?.id) return;
  if (!fileResguardoFirmado.value) { error.value = 'Selecciona un archivo.'; return; }

  loadingResguardoFirmado.value = true;
  try {
    const fd = new FormData();
    fd.append('file', fileResguardoFirmado.value);

    await axios.post(`${API}/inventario/${item.value.id}/resguardo/firmado`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    fileResguardoFirmado.value = null;
    await cargarDetalle(item.value.id);
    await cargarListado();
    success.value = '✅ Resguardo firmado subido.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo subir el resguardo firmado.';
  } finally {
    loadingResguardoFirmado.value = false;
  }
}

async function subirAlInventario() {
  clearMessages();
  if (!item.value?.id) return;
  if (!canSubirAlInventario.value) {
    error.value = 'Faltan requisitos: FACTURA + RESGUARDO_FIRMADO.';
    return;
  }
  if (!confirm('¿Subir este bien al inventario ACTIVO?')) return;

  loadingSubir.value = true;
  try {
    await axios.post(`${API}/inventario/${item.value.id}/subir`);
    await cargarDetalle(item.value.id);
    await cargarListado();
    success.value = '✅ Bien subido al inventario (ACTIVO).';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo subir al inventario.';
  } finally {
    loadingSubir.value = false;
  }
}

async function subirResguardoCancelado() {
  clearMessages();
  if (!item.value?.id) return;
  if (!fileResguardoCancelado.value) { error.value = 'Selecciona un archivo.'; return; }

  loadingResguardoCancelado.value = true;
  try {
    const fd = new FormData();
    fd.append('file', fileResguardoCancelado.value);

    await axios.post(`${API}/inventario/${item.value.id}/resguardo/cancelado`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    fileResguardoCancelado.value = null;
    await cargarDetalle(item.value.id);
    await cargarListado();
    success.value = '✅ Resguardo cancelado subido.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo subir el resguardo cancelado.';
  } finally {
    loadingResguardoCancelado.value = false;
  }
}

// cancelar resguardo y crear nuevo borrador
const cancelForm = reactive({
  personalIdNuevo: '',
  responsableNuevo: '',
  rfcNuevo: '',
  puestoNuevo: '',        // ✅ NUEVO
  ubicacionIdNuevo: '',
});



async function cancelarResguardo() {
  clearMessages();
  if (!item.value?.id) return;
  if (!canCancelResguardo.value) return;

  if (!tieneResguardoCancelado.value) {
    error.value = 'Primero sube RESGUARDO_CANCELADO.';
    return;
  }

  if (!cancelForm.personalIdNuevo) {
    error.value = 'Selecciona un responsable del catálogo.';
    return;
  }

  if (!cancelForm.responsableNuevo.trim()) { error.value = 'responsableNuevo requerido.'; return; }
  if (!cancelForm.rfcNuevo.trim()) { error.value = 'rfcNuevo requerido.'; return; }

  if (!confirm('¿Cancelar el resguardo ACTIVO y crear uno nuevo en BORRADOR?')) return;

  loadingCancelarResguardo.value = true;
  try {
    const payload: any = {
      responsableNuevo: cancelForm.responsableNuevo.trim(),
      rfcNuevo: cancelForm.rfcNuevo.trim(),
      puestoNuevo: cancelForm.puestoNuevo?.trim() || null, // ✅
      personalId: cancelForm.personalIdNuevo ? Number(cancelForm.personalIdNuevo) : null, // ✅
      ubicacionIdNuevo: cancelForm.ubicacionIdNuevo ? Number(cancelForm.ubicacionIdNuevo) : null,
    };


    await axios.post(`${API}/inventario/${item.value.id}/resguardo/cancelar`, payload);
    cancelForm.personalIdNuevo = '';
    cancelForm.responsableNuevo = '';
    cancelForm.rfcNuevo = '';
    cancelForm.puestoNuevo = '';
    cancelForm.ubicacionIdNuevo = '';


    await cargarDetalle(item.value.id);
    await cargarListado();
    success.value = '✅ Resguardo cancelado y nuevo BORRADOR creado.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo cancelar el resguardo.';
  } finally {
    loadingCancelarResguardo.value = false;
  }
}

async function exportar() {
  clearMessages();
  try {
    const params: any = {
      estadoLogico: tabEstado.value,
      q: f.q.trim() || undefined,
      responsable: f.responsable.trim() || undefined,
      ubicacionId: f.ubicacionId ? Number(f.ubicacionId) : undefined,
      estadoId: f.estadoId ? Number(f.estadoId) : undefined,
      tipo: f.tipo || undefined,
      categoria: f.categoria || undefined,
    };

    const { data } = await axios.get(API + '/inventario', { params });
    const rows = (Array.isArray(data) ? data : []).map((i: any) => ({
      'Estado lógico': i.estadoLogico || '',
      'No. Inventario': i.no_inventario || '',
      'Nombre': i.nombre || '',
      'Responsable': i.responsable || '',
      'RFC': i.rfc || '',
      'Ubicación': i.ubicacion?.nombre || '',
      'Estado físico': i.estado?.label || '',
      'Tipo': i.tipo ?? i.tipo_bien ?? '',
      'Categoría': i.categoria ?? '',

      // ✅ NUEVO
      'Folio factura': i.no_factura || '',
      'Costo adquisición': i.costo_adquisicion ?? '',
      'Fecha adjudicación': i.fecha_adjudicacion?.slice(0,10) || '',
      'Fecha entrega': i.fecha_entrega?.slice(0,10) || '',
      'Marca': i.marca || '',
      'Modelo': i.modelo || '',
      'No. serie': i.no_serie || '',
      'Tipo propiedad': i.tipoPropiedad || '',
      'Proveedor': i.proveedor?.nombre || '',
      'Proveedor RFC': i.proveedor?.rfc || '',
      'Clasificación sigla': i.clasificacion?.sigla || '',
      'Clasificación nombre': i.clasificacion?.cuenta || '',
      'Observaciones': i.observaciones || '',
    }));


    const esc = (v: any) => {
      const s = String(v ?? '').replaceAll('"', '""').replaceAll('\n', ' ').replaceAll('\r', ' ');
      return `"${s}"`;
    };

    const header = Object.keys(rows[0] || {}).join(',');
    const lines = rows.map((r: any) => Object.values(r).map(esc).join(','));


    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${tabEstado.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    success.value = '✅ Exportación generada.';
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No se pudo exportar.';
  }
}

onMounted(async () => {
  if (!auth.ready) await auth.ensure();

  await Promise.allSettled([
    cargarCatalogos(),
    cargarPersonal(),
  ]);

  await cargarListado();
});


watch(
    () => route.params.id,
    async (v) => {
      const id = v ? Number(v) : null;

      // si el URL trae id => abre modal pero SIN router.replace (evita loop)
      if (id) await openDetail(id, { syncRoute: false });

      // si ya no hay id en URL y el modal está abierto => ciérralo sin tocar URL
      else if (showDetail.value) closeDetail({ syncRoute: false });
    },
    { immediate: true }
);

watch(() => form.personalId, (id) => {
  if (!id) {
    form.responsable = '';
    form.rfc = '';
    form.responsablePuesto = '';
    return;
  }
  const p = personal.value.find(x => String(x.id) === String(id));
  if (!p) return;
  form.responsable = p.nombre;
  form.rfc = p.rfc;
  form.responsablePuesto = p.puesto;
});

watch(() => cancelForm.personalIdNuevo, (id) => {
  if (!id) {
    cancelForm.responsableNuevo = '';
    cancelForm.rfcNuevo = '';
    cancelForm.puestoNuevo = '';
    return;
  }
  const p = personal.value.find(x => String(x.id) === String(id));
  if (!p) return;
  cancelForm.responsableNuevo = p.nombre;
  cancelForm.rfcNuevo = p.rfc;
  cancelForm.puestoNuevo = p.puesto || '';
});

watch(
    () => form.personalId,
    (v) => {
      if (!v) return;

      const p = (personal.value || []).find((x: any) => String(x.id) === String(v));
      if (!p) return;

      form.responsable = p.nombre || '';
      form.rfc = p.rfc || '';
      form.responsablePuesto = p.puesto || '';
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
.badge-blue { @apply bg-blue-50 border-blue-200 text-blue-700; }
.badge-gray { @apply bg-gray-50 border-gray-200 text-gray-600; }

.card { @apply p-3 rounded border bg-white; }

.modal-backdrop { @apply fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50; }
.modal { @apply w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col; }
.modal-head { @apply px-4 py-3 border-b flex items-start justify-between gap-3; }
.modal-body { @apply p-4 overflow-y-auto; }

.file-input { @apply block w-full text-sm text-gray-700; }
.file-input::file-selector-button { @apply mr-3 py-2 px-3 rounded border-0 bg-gray-200 text-gray-800 hover:bg-gray-300; }

.btn-mini { @apply text-xs px-2 py-1 rounded-lg; }
</style>