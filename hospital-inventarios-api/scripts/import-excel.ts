// scripts/import-excel.ts
import 'dotenv/config';
import ExcelJS from 'exceljs';
import { prisma } from '../src/prisma.js';

const EXCEL_PATH = process.env.EXCEL_PATH || '/app/assets/FORMATO INVENTARIO DE BIENES HOSPITAL AMISTAD.xlsx';

// Mapeos / helpers
const MEDICOS = new Set(['EM','IM','MI','ME','MA','CV','ET']); // puedes ajustar
const estadoMap: Record<string, {code:string,label:string,orden:number}> = {
    'B': { code:'BUENO',   label:'Bueno',   orden:20 },
    'M': { code:'MALO',    label:'Malo',    orden:40 },
    'R': { code:'REGULAR', label:'Regular', orden:30 },
};

function toStr(v:any) { return (v ?? '').toString().trim(); }
function toDate(v:any) {
    if (!v) return null;
    try {
        // exceljs da Date o número de serie; manejamos ambos
        if (v instanceof Date) return v;
        const n = Number(v);
        if (!isNaN(n)) {
            const d = new Date(Math.round((n - 25569) * 86400 * 1000)); // serial Excel -> Date
            return d;
        }
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
}
function toDecimal(v:any) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number((v+'').replace(/[^0-9.,-]/g,'').replace(',','.'));
    return isNaN(n) ? null : n;
}

async function upsertEstado(letra:string) {
    const e = estadoMap[letra];
    if (!e) return null;
    const r = await prisma.estadoFisico.upsert({
        where: { code: e.code },
        update: {},
        create: { code: e.code, label: e.label, orden: e.orden },
    });
    return r.id;
}

async function upsertUbicacion(nombre:string) {
    const code = nombre.toUpperCase().replace(/\s+/g,'_').slice(0,32);
    const r = await prisma.ubicacion.upsert({
        where: { code },
        update: { nombre },
        create: { code, nombre, orden: 50 },
    });
    return r.id;
}

async function upsertClasificacion(sigla:string) {
    const s = sigla.toUpperCase();
    const r = await prisma.clasificacionBien.upsert({
        where: { sigla: s },
        update: {},
        create: { sigla: s },
    });
    return r.id;
}

async function main() {
    console.log('Leyendo:', EXCEL_PATH);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_PATH);

    // Tomamos la PRIMER hoja y buscamos el row del encabezado
    const ws = wb.worksheets[0];
    // buscamos la celda que dice "NUMERO DE ETIQUETA"
    let headerRowIdx = -1;
    for (let r = 1; r <= 30 && headerRowIdx === -1; r++) {
        const txt = toStr(ws.getRow(r).values);
        if (txt.toUpperCase().includes('NUMERO DE ETIQUETA') || txt.toUpperCase().includes('NÚMERO DE ETIQUETA')) {
            headerRowIdx = r;
        }
    }
    if (headerRowIdx === -1) headerRowIdx = 6; // fallback (tu archivo lo traía en la fila 6)

    // Indices de columnas (por nombre)
    const headers = (ws.getRow(headerRowIdx).values as any[]).map(toStr);
    function ci(name:string) {
        const i = headers.findIndex(h => h.toUpperCase().includes(name.toUpperCase()));
        if (i === -1) throw new Error(`No se encontró encabezado: ${name}`);
        return i;
    }

    const cConsec   = ci('NÚMERO CONSECUTIVO');
    const cInvent   = ci('NUMERO DE ETIQUETA');
    const cDesc     = ci('DESCRIPCIÓN DETALLADA DEL BIEN');
    const cUbic     = ci('UBICACIÓN FÍSICA');
    const cClasif   = ci('CLASIFICACION DEL BIEN');
    const cCuenta   = ci('CUENTA');
    const cMarca    = ci('MARCA');
    const cModelo   = ci('MODELO');
    const cSerie    = ci('SERIE');
    const cEstado   = ci('ESTADO FISICO');
    const cObs      = ci('OBSERVACIONES');
    const cObs2     = ci('OTRAS OBSERVACIONES');
    // costo (no viene en ese excel; si luego agregas columna, buscala aquí)
    // const cCosto = ci('COSTO');

    let ok = 0, skip = 0, fail = 0;
    for (let r = headerRowIdx + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const noInv = toStr(row.getCell(cInvent).value);
        if (!noInv) continue;

        const nombre   = toStr(row.getCell(cDesc).value);
        const ubic     = toStr(row.getCell(cUbic).value);
        const clasif   = toStr(row.getCell(cClasif).value);
        const cuenta   = toStr(row.getCell(cCuenta).value);
        const marca    = toStr(row.getCell(cMarca).value);
        const modelo   = toStr(row.getCell(cModelo).value);
        const serie    = toStr(row.getCell(cSerie).value);
        const estadoL  = toStr(row.getCell(cEstado).value).toUpperCase(); // B/M/R
        const obs      = toStr(row.getCell(cObs).value);
        const obs2     = toStr(row.getCell(cObs2).value);

        try {
            // Relaciones
            const estadoId    = await upsertEstado(estadoL);
            const ubicacionId = ubic ? await upsertUbicacion(ubic) : null;
            const clasifId    = clasif ? await upsertClasificacion(clasif) : null;

            // Tipo según siglas (ajústalo si hace falta)
            const tipo = MEDICOS.has(clasif.toUpperCase()) ? 'MEDICO' : 'ADMINISTRATIVO';

            // Si ya existe, actualizamos básico; si no, creamos
            await prisma.inventoryItem.upsert({
                where: { no_inventario: noInv },
                update: {
                    nombre,
                    cuenta: cuenta || null,
                    marca: marca || null,
                    modelo: modelo || null,
                    no_serie: serie || null,
                    observaciones: obs || null,
                    otras_observaciones: obs2 || null,
                    estadoId,
                    ubicacionId,
                    clasificacionId: clasifId,
                    tipo,
                },
                create: {
                    no_inventario: noInv,
                    nombre,
                    responsable: '',   // no viene en el excel
                    rfc: '',           // no viene en el excel
                    cuenta: cuenta || null,
                    marca: marca || null,
                    modelo: modelo || null,
                    no_serie: serie || null,
                    observaciones: obs || null,
                    otras_observaciones: obs2 || null,
                    estadoId,
                    ubicacionId,
                    clasificacionId: clasifId,
                    tipo,
                    consecutivo: Number(toStr(row.getCell(cConsec).value)) || null,
                    // costo_adquisicion: toDecimal(row.getCell(cCosto).value),
                }
            });

            ok++;
        } catch (e:any) {
            fail++;
            console.error(`Fila ${r}:`, e.message);
        }
    }

    console.log({ ok, skip, fail });
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
