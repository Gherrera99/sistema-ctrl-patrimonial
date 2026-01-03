//api/src/dictamen/dictamen.pdf.ts

import PDFDocument from 'pdfkit';

const MARGINS = { top: 32, bottom: 34, left: 36, right: 36 };
const H_SMALL = 40;
const H_MID = 72;
const H_SIGN = 96;
const GAP = 10;

function box(doc: PDFDocument, x: number, y: number, w: number, h: number, title: string, value = '') {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title + ':', x + 8, y + 6, { width: w - 16 });
    doc.font('Helvetica').fontSize(10).text(value, x + 8, y + 22, { width: w - 16, height: h - 28 });
}

function addLogo(doc: PDFDocument, x: number, y: number, w: number, h: number, path?: string) {
    if (!path) return;
    try { doc.image(path, x, y, { width: w, height: h, align: 'center', valign: 'center' }); } catch {}
}

function header(doc: PDFDocument, entity: string, title: string, logoLeft?: string, logoRight?: string) {
    const pageWidth = doc.page.width;
    const m = doc.page.margins.left;

    addLogo(doc, m, 28, 90, 48, logoLeft);
    addLogo(doc, pageWidth - m - 90, 28, 90, 48, logoRight);

    doc.font('Helvetica-Bold').fontSize(14).text(entity || 'HOSPITAL DE LA AMISTAD', 0, 34, { align: 'center' });
    doc.fontSize(12).text(title, 0, 54, { align: 'center' });

    const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.font('Helvetica').fontSize(10).text(fecha, pageWidth - m - 200, 18, { width: 190, align: 'right' });

    doc.moveTo(m, 90).lineTo(pageWidth - m, 90).stroke();
}

function signatureBlock(doc: PDFDocument, x: number, y: number, w: number, h: number, title: string, nombre?: string, puesto?: string) {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 6, { width: w - 16 });

    const lineY = y + h - 30;
    doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();
    if (nombre) doc.font('Helvetica').fontSize(10).text(nombre, x + 12, lineY + 4, { width: w - 24, align: 'center' });
    if (puesto) doc.font('Helvetica').fontSize(9).text(puesto, x + 12, lineY + 18, { width: w - 24, align: 'center' });
}

export function buildDictamenPdf(dictamen: any, cfg: any) {
    const left = process.env.PDF_LOGO_LEFT;
    const right = process.env.PDF_LOGO_RIGHT;
    const entity = process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD';

    const doc = new PDFDocument({ size: 'LETTER', margins: MARGINS });

    const coord = String(dictamen.coordinacionTipo ?? '').toUpperCase();
    const tituloCoord = cfg?.tituloCoordinacion
        || (coord === 'TECNOLOGIAS' ? 'COORDINACIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN' : 'COORDINACIÓN DE MANTENIMIENTO');

    header(doc, entity, 'DICTAMEN TÉCNICO', left, right);

    const m = doc.page.margins.left;
    const usableW = doc.page.width - m - doc.page.margins.right;
    const colW = (usableW - 8) / 2;
    let y = 98;

    const bien = dictamen.bien;

    box(doc, m, y, colW, H_SMALL, 'FOLIO', dictamen.folio || String(dictamen.id));
    box(doc, m + colW + 8, y, colW, H_SMALL, 'COORDINACIÓN', tituloCoord);
    y += H_SMALL + GAP;

    box(doc, m, y, colW, H_SMALL, 'NO. INVENTARIO', bien?.no_inventario || '');
    box(doc, m + colW + 8, y, colW, H_SMALL, 'NO. SERIE', bien?.no_serie || '');
    y += H_SMALL + GAP;

    box(doc, m, y, colW, H_SMALL, 'BIEN', bien?.nombre || '');
    box(doc, m + colW + 8, y, colW, H_SMALL, 'UBICACIÓN', bien?.ubicacion?.nombre || dictamen.ubicacionFisica || '');
    y += H_SMALL + GAP;

    box(doc, m, y, colW, H_SMALL, 'MARCA', bien?.marca || '');
    box(doc, m + colW + 8, y, colW, H_SMALL, 'MODELO', bien?.modelo || '');
    y += H_SMALL + GAP;

    box(doc, m, y, usableW, H_MID, 'DICTAMEN', dictamen.dictamenTexto || '');
    y += H_MID + GAP;

    doc.rect(m, y, usableW, 18).stroke();
    doc.font('Helvetica-Bold').fontSize(10).text('FIRMAS:', m + 8, y + 3);
    y += 24;

    signatureBlock(
        doc,
        m,
        y,
        usableW,
        H_SIGN,
        'ELABORÓ / EMITIÓ DICTAMEN',
        cfg?.firmanteNombre || dictamen.firmadoPor || '_________________________',
        cfg?.firmantePuesto || dictamen.puestoFirmante || '_________________________'
    );

    return doc;
}


