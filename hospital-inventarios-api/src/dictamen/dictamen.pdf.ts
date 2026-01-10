// api/src/dictamen/dictamen.pdf.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const MARGINS = { top: 32, bottom: 34, left: 36, right: 36 };

const H_FIELD = 40;
const GAP = 10;

const BAR_H = 18;     // barra negra (DICTAMEN / FIRMAS)
const BAR_GAP = 6;

const SIGN_H = 96;    // altura caja firma

type TextAlign = 'left' | 'center' | 'right' | 'justify';

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

function formatFechaLarga(d = new Date()) {
    // "viernes, 10 de enero de 2026" -> "Viernes, 10 de enero de 2026"
    const s = new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(d);

    return s.charAt(0).toUpperCase() + s.slice(1);
}

function addLogo(doc: PDFDocument, x: number, y: number, w: number, h: number, img?: Buffer | null) {
    if (!img) return;
    try {
        // fit => NO deforma
        doc.image(img, x, y, { fit: [w, h], align: 'center', valign: 'center' });
    } catch {}
}

function header(
    doc: PDFDocument,
    entity: string,
    title: string,
    address: string,
    logoLeft?: Buffer | null,
    logoRight?: Buffer | null
) {
    const pageWidth = doc.page.width;
    const m = doc.page.margins.left;

    addLogo(doc, m, 22, 80, 52, logoLeft);
    addLogo(doc, pageWidth - m - 80, 22, 80, 52, logoRight);

    doc.font('Helvetica-Bold').fontSize(14).text(entity || 'HOSPITAL DE LA AMISTAD', 0, 30, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).text(title, 0, 50, { align: 'center' });

    // dirección (debajo del título)
    doc.font('Helvetica').fontSize(9).text(
        address || '',
        m + 90,
        70,
        { width: pageWidth - (m + 90) - (m + 90), align: 'center' }
    );

    // fecha (arriba derecha)
    const fecha = formatFechaLarga(new Date());
    doc.font('Helvetica').fontSize(9).text(fecha, pageWidth - m - 240, 14, { width: 230, align: 'right' });

    doc.moveTo(m, 96).lineTo(pageWidth - m, 96).stroke();
}

function writeValue(
    doc: PDFDocument,
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { align?: TextAlign; size?: number } = {}
) {
    const raw = String(value ?? '');
    const align: TextAlign = opts.align ?? 'left';
    const size = opts.size ?? 10;

    doc.font('Helvetica').fontSize(size);
    doc.text(raw, x, y, { width: w, height: h, align });
}

function box(doc: PDFDocument, x: number, y: number, w: number, h: number, title: string, value = '') {
    doc.rect(x, y, w, h).stroke();
    doc.font('Helvetica-Bold').fontSize(9).text(title + ':', x + 8, y + 6, { width: w - 16 });
    writeValue(doc, value, x + 8, y + 22, w - 16, h - 28);
}

function blackBar(doc: PDFDocument, x: number, y: number, w: number, label: string) {
    doc.save();
    doc.rect(x, y, w, BAR_H).fill('#000');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text(label, x, y + 4, { width: w, align: 'center' });
    doc.restore();
    doc.fillColor('#000');
}

function signatureBlockBottom(
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

    // Calcula cuánto ocupan nombre/puesto (wrap) y sube/baja la línea para que quepa sin "..."
    const name = (nombre || '').trim();
    const pos = (puesto || '').trim();

    doc.font('Helvetica').fontSize(10);
    const nameH = name ? doc.heightOfString(name, { width: w - 24, align: 'center' }) : 0;

    doc.font('Helvetica').fontSize(9);
    const posH = pos ? doc.heightOfString(pos, { width: w - 24, align: 'center' }) : 0;

    // padding + separaciones
    const footerH = Math.min(Math.max(38, 10 + nameH + posH + 10), h - 22);
    const lineY = y + h - footerH;

    doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();

    if (name) {
        doc.font('Helvetica').fontSize(10).text(name, x + 12, lineY + 4, { width: w - 24, align: 'center' });
    }
    if (pos) {
        doc.font('Helvetica').fontSize(9).text(pos, x + 12, lineY + 4 + nameH + 2, { width: w - 24, align: 'center' });
    }
}

export function buildDictamenPdf(dictamen: any, cfg: any) {
    // logos (mismos env que resguardo)
    const logoL = loadImageBuffer(process.env.PDF_LOGO_LEFT);
    const logoR = loadImageBuffer(process.env.PDF_LOGO_RIGHT);

    const entity = process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD';
    const address =
        process.env.PDF_HEADER_ADDRESS ||
        process.env.PDF_ADDRESS ||
        'CALLE 60 SUR S/N COL SAN JOSE TECOH X ANILLO PERIFERICO SAN JOSE TECOH PONIENTE';

    const doc = new PDFDocument({ size: 'LETTER', margins: MARGINS });

    const coord = String(dictamen.coordinacionTipo ?? '').toUpperCase();
    const tituloCoord =
        cfg?.tituloCoordinacion ||
        (coord === 'TECNOLOGIAS'
            ? 'COORDINACIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN'
            : 'COORDINACIÓN DE MANTENIMIENTO');

    header(doc, entity, 'DICTAMEN TÉCNICO', address, logoL, logoR);

    const m = doc.page.margins.left;
    const usableW = doc.page.width - m - doc.page.margins.right;
    const colW = (usableW - 8) / 2;

    const bien = dictamen.bien || {};

    // ---- Firma SIEMPRE al pie ----
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    const ySign = pageBottom - SIGN_H;                 // caja firma pegada al margen inferior
    const yFirmasBar = ySign - (BAR_H + BAR_GAP);      // barra "FIRMAS" justo encima

    // ---- Campos superiores ----
    let y = 104;

    box(doc, m, y, colW, H_FIELD, 'FOLIO', dictamen.folio || String(dictamen.id));
    box(doc, m + colW + 8, y, colW, H_FIELD, 'COORDINACIÓN', tituloCoord);
    y += H_FIELD + GAP;

    box(doc, m, y, colW, H_FIELD, 'NO. INVENTARIO', bien?.no_inventario || '');
    box(doc, m + colW + 8, y, colW, H_FIELD, 'NO. SERIE', bien?.no_serie || '');
    y += H_FIELD + GAP;

    box(doc, m, y, colW, H_FIELD, 'BIEN', bien?.nombre || '');
    box(doc, m + colW + 8, y, colW, H_FIELD, 'UBICACIÓN', bien?.ubicacion?.nombre || dictamen.ubicacionFisica || '');
    y += H_FIELD + GAP;

    box(doc, m, y, colW, H_FIELD, 'MARCA', bien?.marca || '');
    box(doc, m + colW + 8, y, colW, H_FIELD, 'MODELO', bien?.modelo || '');
    y += H_FIELD + GAP;

    // ---- DICTAMEN (barra + área grande hasta antes de firmas) ----
    const yDictBar = y;
    blackBar(doc, m, yDictBar, usableW, 'DICTAMEN');

    const yDictBox = yDictBar + BAR_H;
    const dictH = Math.max(120, (yFirmasBar - GAP) - yDictBox); // ocupa todo lo disponible
    doc.rect(m, yDictBox, usableW, dictH).stroke();

    doc.font('Helvetica').fontSize(10).text(
        dictamen.dictamenTexto || '',
        m + 10,
        yDictBox + 10,
        { width: usableW - 20, height: dictH - 20, align: 'left' }
    );

    // ---- FIRMAS al pie ----
    blackBar(doc, m, yFirmasBar, usableW, 'FIRMAS');

    signatureBlockBottom(
        doc,
        m,
        ySign,
        usableW,
        SIGN_H,
        'ELABORÓ / EMITIÓ DICTAMEN',
        cfg?.firmanteNombre || dictamen.firmadoPor || '_________________________',
        cfg?.firmantePuesto || dictamen.puestoFirmante || '_________________________'
    );

    return doc;
}
