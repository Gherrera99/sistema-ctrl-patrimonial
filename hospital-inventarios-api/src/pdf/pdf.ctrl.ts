import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../prisma.js';
import fs from 'fs';
import path from 'path';

const MARGINS = { top: 32, bottom: 34, left: 36, right: 36 };
const H_SMALL = 40;
const H_MID   = 62;
const H_SIGN  = 96;
const GAP     = 10;

function resolveFile(p?: string) {
    if (!p) return null;
    const s = p.trim();
    if (!s) return null;
    return path.isAbsolute(s) ? s : path.resolve(s);
}

function loadImageBuffer(p?: string) {
    const fp = resolveFile(p);
    if (!fp) return null;
    try {
        if (!fs.existsSync(fp)) return null;
        return fs.readFileSync(fp);
    } catch {
        return null;
    }
}

function fitMultilineToHeight(doc: PDFDocument, text: string, width: number, height: number) {
    const raw = String(text ?? '');
    if (!raw) return '';
    if (doc.heightOfString(raw, { width }) <= height) return raw;

    let s = raw;
    while (s.length > 1 && doc.heightOfString(s + '…', { width }) > height) {
        s = s.slice(0, -1);
    }
    return s + '…';
}

type TextAlign = 'left' | 'center' | 'right' | 'justify';

function writeValue(
    doc: PDFDocument,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { align?: TextAlign; maxSize?: number; minSize?: number } = {}
) {
    const raw = String(value ?? '');
    const align: TextAlign = opts.align ?? 'left';
    const maxSize = opts.maxSize ?? 10;
    const minSize = opts.minSize ?? 7;

    for (let size = maxSize; size >= minSize; size--) {
        doc.font('Helvetica').fontSize(size);
        const fitted = fitMultilineToHeight(doc, raw, w, h);
        if (doc.heightOfString(fitted, { width: w, align }) <= h) {
            doc.text(fitted, x, y, { width: w, align });
            return;
        }
    }

    doc.font('Helvetica').fontSize(minSize);
    doc.text(fitMultilineToHeight(doc, raw, w, h), x, y, { width: w, align });
}

function writeValueBold(
    doc: PDFDocument,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { align?: TextAlign; maxSize?: number; minSize?: number } = {}
) {
    const raw = String(value ?? '');
    const align: TextAlign = opts.align ?? 'left';
    const maxSize = opts.maxSize ?? 10;
    const minSize = opts.minSize ?? 7;

    for (let size = maxSize; size >= minSize; size--) {
        doc.font('Helvetica-Bold').fontSize(size);
        const fitted = fitMultilineToHeight(doc, raw, w, h);
        if (doc.heightOfString(fitted, { width: w, align }) <= h) {
            doc.text(fitted, x, y, { width: w, align });
            return;
        }
    }

    doc.font('Helvetica').fontSize(minSize);
    doc.text(fitMultilineToHeight(doc, raw, w, h), x, y, { width: w, align });
}

function box(doc: PDFDocument, x: number, y: number, w: number, h: number, title: string, value = '') {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title + ':', x + 8, y + 6, { width: w - 16 });
    writeValue(doc, value, x + 8, y + 22, w - 16, h - 28);
}

function addLogo(doc: PDFDocument, x: number, y: number, w: number, h: number, img?: Buffer | null) {
    if (!img) return;
    try {
        doc.image(img, x, y, { fit: [w, h], align: 'center', valign: 'center' }); // ✅ NO se deforma
    } catch {}
}

function fechaLargaMX(d = new Date()) {
    const dia = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(d);
    const resto = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    const s = `${dia}, ${resto}`;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function header(doc: PDFDocument, entity: string, address: string, logoLeft?: Buffer | null, logoRight?: Buffer | null) {
    const pageWidth = doc.page.width;
    const m = doc.page.margins.left;

    // logos (cajas fijas)
    addLogo(doc, m, 22, 80, 52, logoLeft);
    addLogo(doc, pageWidth - m - 80, 22, 80, 52, logoRight);

    doc.font('Helvetica-Bold').fontSize(14).text(entity || 'HOSPITAL DE LA AMISTAD', 0, 30, { align: 'center' });
    doc.fontSize(12).text('RESGUARDO DE BIENES MUEBLES', 0, 50, { align: 'center' });

    // dirección (más pequeña debajo, centrada)
    doc.font('Helvetica').fontSize(9).text(
        address || '',
        m + 90, // deja respirar a los logos
        70,
        { width: pageWidth - (m + 90) - (m + 90), align: 'center' }
    );

    // fecha
    const fecha = fechaLargaMX(new Date());
    doc.font('Helvetica').fontSize(9).text(fecha, pageWidth - m - 260, 14, { width: 250, align: 'right' });


    doc.moveTo(m, 96).lineTo(pageWidth - m, 96).stroke();
}

const SIG_FOOTER_2_BASE = 38; // nombre + puesto
const SIG_FOOTER_3_BASE = 54; // nombre + puesto + entidad

type Layout2 = { footerH: number; delta: number; nombreH: number; puestoH: number };
type Layout3 = { footerH: number; delta: number; aH: number; bH: number; cH: number };

function measure(doc: PDFDocument, text: string, width: number, font: string, size: number) {
    doc.font(font).fontSize(size);
    return doc.heightOfString(String(text ?? ''), { width, align: 'center' });
}

function layoutFirma2(doc: PDFDocument, width: number, nombre?: string, puesto?: string): Layout2 {
    const nombreH = nombre ? measure(doc, nombre, width, 'Helvetica', 10) : 0;
    const puestoH = puesto ? measure(doc, puesto, width, 'Helvetica', 9) : 0;

    // padding + nombre + (gap) + puesto + padding
    const required = 4 + nombreH + (puesto ? 2 : 0) + puestoH + 6;
    const delta = Math.max(0, Math.ceil(required - SIG_FOOTER_2_BASE));

    return { footerH: SIG_FOOTER_2_BASE + delta, delta, nombreH, puestoH };
}

function layoutFirma3(doc: PDFDocument, width: number, a: string, b: string, c: string): Layout3 {
    const aH = a ? measure(doc, a, width, 'Helvetica', 10) : 0;
    const bH = b ? measure(doc, b, width, 'Helvetica', 9) : 0;
    const cH = c ? measure(doc, c, width, 'Helvetica-Bold', 9) : 0;

    const required = 4 + aH + 2 + bH + 2 + cH + 6;
    const delta = Math.max(0, Math.ceil(required - SIG_FOOTER_3_BASE));

    return { footerH: SIG_FOOTER_3_BASE + delta, delta, aH, bH, cH };
}

function signatureBlockDyn2(
    doc: PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,              // altura total del bloque (puede crecer)
    title: string,
    nombre: string,
    puesto: string,
    lay: Layout2            // footer calculado (SIN recorte)
) {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 6, { width: w - 16 });

    const lineY = y + h - lay.footerH;
    doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();

    let ty = lineY + 4;

    if (nombre) {
        doc.font('Helvetica').fontSize(10).text(nombre, x + 12, ty, { width: w - 24, align: 'center' });
        ty += lay.nombreH + 2;
    }

    if (puesto) {
        doc.font('Helvetica').fontSize(9).text(puesto, x + 12, ty, { width: w - 24, align: 'center' });
    }
}

function signatureBlockDyn3(
    doc: PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    nombre: string,
    puesto: string,
    entidad: string,
    lay: Layout3
) {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 6, { width: w - 16 });

    const lineY = y + h - lay.footerH;
    doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();

    let ty = lineY + 4;

    doc.font('Helvetica').fontSize(10).text(nombre, x + 12, ty, { width: w - 24, align: 'center' });
    ty += lay.aH + 2;

    doc.font('Helvetica').fontSize(9).text(puesto, x + 12, ty, { width: w - 24, align: 'center' });
    ty += lay.bH + 2;

    doc.font('Helvetica-Bold').fontSize(9).text(entidad, x + 12, ty, { width: w - 24, align: 'center' });
}


function signatureBlock(
    doc: PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    nombre?: string,
    puesto?: string
) {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 6, { width: w - 16 });

    // Reservamos espacio abajo para nombre/puesto
    const footerH = 38; // suficiente para 2 renglones
    const lineY = y + h - footerH;
    doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();

    // Nombre y puesto debajo de la línea, centrados y limitados por altura
    if (nombre) writeValue(doc, nombre, x + 12, lineY + 4, w - 24, 14, { align: 'center', maxSize: 10, minSize: 8 });
    if (puesto) writeValue(doc, puesto, x + 12, lineY + 18, w - 24, footerH - 22, { align: 'center', maxSize: 9, minSize: 7 });
}

function signatureBlockDirector(
    doc: PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    nombre: string,
    puesto: string,
    entidad: string
) {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 6, { width: w - 16 });

    // 3 líneas debajo de la firma (nombre / puesto / entidad)
    const footerH = 54;
    const lineY = y + h - footerH;
    doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();

    writeValue(doc, nombre,  x + 12, lineY + 4,  w - 24, 14, { align: 'center', maxSize: 10, minSize: 8 });
    writeValue(doc, puesto,  x + 12, lineY + 18, w - 24, 16, { align: 'center', maxSize: 9,  minSize: 7 });
    writeValueBold(doc, entidad, x + 12, lineY + 34, w - 24, footerH - 36, { align: 'center', maxSize: 9,  minSize: 7 });
}

export async function resguardoPdf(req: Request, res: Response) {
    const paramId = Number(req.params.id);
    if (!paramId || Number.isNaN(paramId)) return res.status(400).send('ID inválido');

    // ✅ Si existe un BIEN con ese id, interpretamos /resguardo/:id como BIEN ID (tu caso del front)
    let item = await prisma.inventoryItem.findUnique({
        where: { id: paramId },
        include: { estado: true, ubicacion: true, personal: true },
    });

    let rg: any = null;

    if (item) {
        // ✅ Preferir BORRADOR (cuando se canceló y se generó uno nuevo)
        rg = await prisma.resguardoBien.findFirst({
            where: { bienId: item.id, estado: 'BORRADOR' as any },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            include: { ubicacion: true, creadoPor: true, personal: true },
        });

        if (!rg) {
            rg = await prisma.resguardoBien.findFirst({
                where: { bienId: item.id, estado: 'ACTIVO' as any },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                include: { ubicacion: true, creadoPor: true, personal: true },
            });
        }

        // (opcional) último fallback: el más reciente aunque esté cancelado
        if (!rg) {
            rg = await prisma.resguardoBien.findFirst({
                where: { bienId: item.id },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                include: { ubicacion: true, creadoPor: true, personal: true },
            });
        }
    } else {
        // ✅ Si NO existe bien, entonces sí interpretamos como ResguardoBien ID
        rg = await prisma.resguardoBien.findUnique({
            where: { id: paramId },
            include: {
                bien: { include: { estado: true, ubicacion: true, personal: true } },
                ubicacion: true,
                creadoPor: true,
                personal: true,
            },
        });
        item = rg?.bien || null;
    }

    if (!item) return res.status(404).send('No encontrado');

    // ✅ anti-cache para que no te muestre PDF viejo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ... aquí sigue tu generación PDF normal

    const responsableNombre = (rg?.responsable || item.responsable || '').trim();

// ✅ puesto: primero el campo del resguardo, luego el puesto del personal del resguardo, luego el del item
    const responsablePuesto =
        (rg?.responsablePuesto || rg?.personal?.puesto || item.personal?.puesto || '').trim();

    const ubicacionNombre = rg?.ubicacion?.nombre || item.ubicacion?.nombre || '';



    // usuario generador
    const userId = (req as any).user?.id as number | undefined;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    const seguimientoNombre = user?.name || process.env.PDF_CONTROL_NAME || '_________________________';
    const seguimientoPuesto = (user as any)?.puesto || process.env.PDF_CONTROL_TITLE || '';

    // autorizador activo
    const grupo = await prisma.authorizerGroup.findUnique({
        where: { code: item.tipo },
        include: { authorizers: { where: { active: true }, orderBy: { validFrom: 'desc' } } },
    });
    const autorizador = grupo?.authorizers?.[0];

    // ✅ env compatibles
    const entity  = process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD';
    const address =
        process.env.PDF_HEADER_ADDRESS ||
        process.env.PDF_ADDRESS ||
        'CALLE 60 SUR S/N COL SAN JOSE TECOH POR ANILLO PERIFERICO SAN JOSE TECOH PONIENTE';

    // logos robustos (buffer)
    const logoL = loadImageBuffer(process.env.PDF_LOGO_LEFT);
    const logoR = loadImageBuffer(process.env.PDF_LOGO_RIGHT);

    const doc = new PDFDocument({ size: 'LETTER', margins: MARGINS });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    header(doc, entity, address, logoL, logoR);

    const m = doc.page.margins.left;
    const usableW = doc.page.width - m - doc.page.margins.right;
    const colW = (usableW - 8) / 2;
    let y = 104;

    box(doc, m, y, colW, H_SMALL, 'DEPENDENCIA', entity);
    box(doc, m + colW + 8, y, colW, H_SMALL, 'UBICACIÓN', ubicacionNombre);
    y += H_SMALL + GAP;

    box(doc, m, y, colW, H_MID, 'DESCRIPCIÓN DEL BIEN', item.nombre || '');
    doc.rect(m + colW + 8, y, colW, H_MID).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text('NO. DE FACTURA:', m + colW + 16, y + 6);
    doc.font('Helvetica').fontSize(10).text(item.no_factura || '', m + colW + 120, y + 4, { width: colW - 130 });
    doc.font('Helvetica-Bold').fontSize(9).text('FECHA ADJUDICACIÓN:', m + colW + 16, y + 26);
    const fAdj = item.fecha_adjudicacion ? item.fecha_adjudicacion.toISOString().slice(0, 10) : '';
    doc.font('Helvetica').fontSize(10).text(fAdj, m + colW + 140, y + 24, { width: colW - 150 });
    y += H_MID + GAP;

    box(doc, m, y, colW, H_SMALL, 'NO. DE INVENTARIO', item.no_inventario);
    box(doc, m + colW + 8, y, colW, H_SMALL, 'NO. DE SERIE', item.no_serie || '');
    y += H_SMALL + GAP;

    box(doc, m, y, colW, H_SMALL, 'MARCA', item.marca || '');
    box(doc, m + colW + 8, y, colW, H_SMALL, 'MODELO', item.modelo || '');
    y += H_SMALL + GAP;

    box(doc, m, y, usableW, H_SMALL, 'ESTADO FÍSICO DEL BIEN', item.estado?.label || '');
    y += H_SMALL + GAP;

    const fEnt = item.fecha_entrega ? item.fecha_entrega.toISOString().slice(0, 10) : '';
    box(doc, m, y, colW, H_MID, 'FECHA DE ENTREGA DEL BIEN', fEnt);
    box(doc, m + colW + 8, y, colW, H_MID, 'OBSERVACIONES', item.observaciones || '');
    y += H_MID + GAP;

    doc.rect(m, y, usableW, 18).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('FIRMAS:', m + 8, y + 3);
    y += 24;

    // signatureBlock(doc, m, y, colW, H_SIGN, 'NOMBRE DEL RESPONSABLE DEL BIEN Y PUESTO', responsableNombre, responsablePuesto);
    //
    // //const tituloAut = itemOk.tipo === 'MEDICO' ? 'AUTORIZÓ DIRECTOR MÉDICO' : 'AUTORIZÓ DIRECTOR ADMINISTRATIVO';
    // const tituloAut = 'AUTORIZÓ ' + autorizador?.title || '';
    // const autX = m + colW + 8;
    // const autH = H_SIGN * 2 + GAP;
    //
    // const autNombre = autorizador?.fullName || '_________________________';
    // const autPuesto = autorizador?.title || '';
    // const autEntidad = autorizador?.entity || entity;
    //
    // signatureBlockDirector(doc, autX, y, colW, autH, tituloAut, autNombre, autPuesto, autEntidad);
    //
    //
    // signatureBlock(doc, m, y + H_SIGN + GAP, colW, H_SIGN, 'RESPONSABLE DEL SEGUIMIENTO Y CONTROL', seguimientoNombre, seguimientoPuesto);

    // ✅ título autorizador (corrige precedencia)
    const tituloAut = (`AUTORIZÓ ${autorizador?.title || ''}`).trim() || 'AUTORIZÓ';

    const autX = m + colW + 8;

    const autNombre = autorizador?.fullName || '_________________________';
    const autPuesto = autorizador?.title || '';
    const autEntidad = autorizador?.entity || entity;

// ---- Layout dinámico (mide textos) ----
    const innerW = colW - 24;

    const layResp = layoutFirma2(doc, innerW, responsableNombre, responsablePuesto);
    const laySeg  = layoutFirma2(doc, innerW, seguimientoNombre, seguimientoPuesto);
    const layDir  = layoutFirma3(doc, innerW, autNombre, autPuesto, autEntidad);

// delta izquierda total
    const deltaLeft = layResp.delta + laySeg.delta;

// hacemos que el alto total (izquierda y derecha) sea el mismo
    const totalDelta = Math.max(deltaLeft, layDir.delta);
    const extra = totalDelta - deltaLeft; // se lo damos al bloque de seguimiento como “aire” extra

    const respH = H_SIGN + layResp.delta;
    const segH  = H_SIGN + laySeg.delta + Math.max(0, extra);
    const autH  = (H_SIGN * 2 + GAP) + totalDelta;

// ---- Dibujo ----
    signatureBlockDyn2(
        doc,
        m,
        y,
        colW,
        respH,
        'NOMBRE DEL RESPONSABLE DEL BIEN Y PUESTO',
        responsableNombre,
        responsablePuesto,
        layResp
    );

    signatureBlockDyn3(
        doc,
        autX,
        y,
        colW,
        autH,
        tituloAut,
        autNombre,
        autPuesto,
        autEntidad,
        layDir
    );

    signatureBlockDyn2(
        doc,
        m,
        y + respH + GAP,
        colW,
        segH,
        'RESPONSABLE DEL SEGUIMIENTO Y CONTROL',
        seguimientoNombre,
        seguimientoPuesto,
        laySeg
    );


    doc.font('Helvetica').fontSize(8).text(
        'ORIGINAL: RESPONSABLE DEL CONTROL PATRIMONIAL    COPIA: RESPONSABLE DEL BIEN',
        m,
        doc.page.height - MARGINS.bottom - 10,
        { width: usableW, align: 'left' }
    );

    doc.end();
}
