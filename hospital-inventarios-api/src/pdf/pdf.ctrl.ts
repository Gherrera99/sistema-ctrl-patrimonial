// hospital-inventarios-api/src/pdf/pdf.ctrl.ts
import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../prisma.js';

// ------------------ utilidades de layout ------------------
const MARGINS = { top: 32, bottom: 34, left: 36, right: 36 };
// Alturas afinadas para que todo quepa en 1 página
const H_SMALL = 40;     // cajas sencillas
const H_MID   = 62;     // descripción/factura | fecha-entrega/obs
const H_SIGN  = 96;     // cada caja de firma
const GAP     = 10;     // separación vertical entre filas

function fitText(doc: PDFDocument, text: string, maxWidth: number, fontSize = 10) {
  // Trunca con "…" si no cabe en una línea
  doc.fontSize(fontSize);
  if (doc.widthOfString(text) <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && doc.widthOfString(s + '…') > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

function box(doc: PDFDocument, x: number, y: number, w: number, h: number, title: string, value = '') {
  doc.rect(x, y, w, h).stroke();
  doc.font('Helvetica-Bold').fontSize(9).text(title + ':', x + 8, y + 6, { width: w - 16 });
  // El texto envuelve en varias líneas dentro del alto disponible
  doc.font('Helvetica').fontSize(10).text(value, x + 8, y + 22, { width: w - 16, height: h - 28 });
}

function addLogo(doc: PDFDocument, x: number, y: number, w: number, h: number, path?: string) {
  if (!path) return;
  try { doc.image(path, x, y, { width: w, height: h, align: 'center', valign: 'center' }); } catch {}
}

function header(doc: PDFDocument, entity: string, logoLeft?: string, logoRight?: string) {
  const pageWidth = doc.page.width;
  const m = doc.page.margins.left;

  // logos
  addLogo(doc, m, 28, 90, 48, logoLeft);
  addLogo(doc, pageWidth - m - 90, 28, 90, 48, logoRight);

  // títulos
  doc.font('Helvetica-Bold').fontSize(14).text(entity || 'HOSPITAL DE LA AMISTAD', 0, 34, { align: 'center' });
  doc.fontSize(12).text('RESGUARDO DE BIENES MUEBLES', 0, 54, { align: 'center' });

  // fecha (separada del logo derecho)
  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.font('Helvetica').fontSize(10).text(fecha, pageWidth - m - 200, 18, { width: 190, align: 'right' });

  // línea base de encabezado
  doc.moveTo(m, 90).lineTo(pageWidth - m, 90).stroke();
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

  // línea de firma
  const lineY = y + h - 30;
  doc.moveTo(x + 12, lineY).lineTo(x + w - 12, lineY).stroke();

  // nombre/puesto centrados
  if (nombre) doc.font('Helvetica').fontSize(10).text(nombre, x + 12, lineY + 4, { width: w - 24, align: 'center' });
  if (puesto)  doc.font('Helvetica').fontSize(9).text(puesto,  x + 12, lineY + 18, { width: w - 24, align: 'center' });
}

// ------------------ controlador ------------------
export async function resguardoPdf(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { estado: true, ubicacion: true },
  });
  if (!item) return res.status(404).send('No encontrado');

  // usuario (seguimiento y control)
  const userId = (req as any).user?.id as number | undefined;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const nombreSeguimiento = user?.name || '_________________________';

  // autorizador activo por tipo
  const grupo = await prisma.authorizerGroup.findUnique({
    where: { code: item.tipo },
    include: { authorizers: { where: { active: true }, orderBy: { validFrom: 'desc' } } },
  });
  const autorizador = grupo?.authorizers?.[0];

  // logos y entidad
  const left = process.env.PDF_LOGO_LEFT;
  const right = process.env.PDF_LOGO_RIGHT;
  const entity = process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD';

  // Dirección completa desde env (sin puntos suspensivos)
  const address =
      process.env.PDF_ADDRESS ||
      'CALLE 60 SUR S/N COL SAN JOSE TECOH X ANILLO PERIFERICO SAN JOSE TECOH PONIENTE';

  // PDF
  const doc = new PDFDocument({ size: 'LETTER', margins: MARGINS });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  header(doc, entity, left, right);

  const m = doc.page.margins.left;
  const usableW = doc.page.width - m - doc.page.margins.right;
  const colW = (usableW - 8) / 2; // 8px de gutter
  let y = 98;

  // 1) Dependencia / Dirección (dirección envuelve hasta 2 líneas sin "…")
  box(doc, m, y, colW, H_SMALL, 'DEPENDENCIA', 'HOSPITAL DE LA AMISTAD');
  box(doc, m + colW + 8, y, colW, H_SMALL, 'DIRECCIÓN', address);
  y += H_SMALL + GAP;

  // 2) Descripción / Factura + Fecha
  box(doc, m, y, colW, H_MID, 'DESCRIPCIÓN DEL BIEN', item.nombre || '');

  // cuadro derecho manual con dos renglones NO. FACTURA + FECHA
  doc.rect(m + colW + 8, y, colW, H_MID).stroke();
  doc.font('Helvetica-Bold').fontSize(9).text('NO. DE FACTURA:', m + colW + 16, y + 6);
  doc.font('Helvetica').fontSize(10).text(item.no_factura || '', m + colW + 120, y + 4, { width: colW - 130 });
  doc.font('Helvetica-Bold').fontSize(9).text('FECHA:', m + colW + 16, y + 26);
  const fAdj = item.fecha_adjudicacion ? item.fecha_adjudicacion.toISOString().slice(0, 10) : '';
  doc.font('Helvetica').fontSize(10).text(fAdj, m + colW + 120, y + 24, { width: colW - 130 });

  y += H_MID + GAP;

  // 3) Ubicación / Serie
  box(doc, m, y, colW, H_SMALL, 'UBICACIÓN FÍSICA', item.ubicacion?.nombre || '');
  box(doc, m + colW + 8, y, colW, H_SMALL, 'NO. DE SERIE', item.no_serie || '');
  y += H_SMALL + GAP;

  // 4) Responsable / Modelo
  box(doc, m, y, colW, H_SMALL, 'RESPONSABLE DEL BIEN', item.responsable || '');
  box(doc, m + colW + 8, y, colW, H_SMALL, 'MODELO', item.modelo || '');
  y += H_SMALL + GAP;

  // 5) Inventario / Marca
  box(doc, m, y, colW, H_SMALL, 'NO. DE INVENTARIO', item.no_inventario);
  box(doc, m + colW + 8, y, colW, H_SMALL, 'MARCA', item.marca || '');
  y += H_SMALL + GAP;

  // 6) Estado físico
  box(doc, m, y, usableW, H_SMALL, 'ESTADO FÍSICO DEL BIEN', item.estado?.label || '');
  y += H_SMALL + GAP;

  // 7) Fecha entrega / Observaciones
  const fEnt = item.fecha_entrega ? item.fecha_entrega.toISOString().slice(0, 10) : '';
  box(doc, m, y, colW, H_MID, 'FECHA DE ENTREGA DEL BIEN', fEnt);
  box(doc, m + colW + 8, y, colW, H_MID, 'OBSERVACIONES', item.observaciones || '');
  y += H_MID + GAP;

  // 8) Encabezado FIRMAS
  doc.rect(m, y, usableW, 18).stroke();
  doc.font('Helvetica-Bold').fontSize(10).text('FIRMAS:', m + 8, y + 3);
  y += 24;

  // 9) Firmas:
  // 9.1 Responsable del bien (izquierda, altura normal)
  signatureBlock(
      doc,
      m,
      y,
      colW,
      H_SIGN,
      'NOMBRE DEL RESPONSABLE DEL BIEN Y PUESTO',
      fitText(doc, item.responsable || '', colW - 24, 10),
      fitText(doc, item.ubicacion?.nombre || '', colW - 24, 9)
  );

  // 9.2 Autorizador ocupa TODA la columna derecha (alto = 2 bloques + gap)
  const tituloAut = item.tipo === 'MEDICO' ? 'AUTORIZÓ DIRECTOR MÉDICO' : 'AUTORIZÓ DIRECTOR ADMINISTRATIVO';
  const nombreAut = autorizador?.fullName || '_________________________';
  const entidadAut = autorizador?.entity || entity;

  const autX = m + colW + 8;
  const autW = colW;
  const autH = H_SIGN * 2 + GAP; // ocupa toda la columna derecha

  // Marco grande
  doc.rect(autX, y, autW, autH).stroke();
  // Título
  doc.font('Helvetica-Bold').fontSize(9).text(tituloAut, autX + 8, y + 6, { width: autW - 16 });

  // NOMBRE (permitimos varias líneas si hace falta)
  doc.font('Helvetica-Bold').fontSize(9).text('NOMBRE:', autX + 8, y + 28);
  doc.font('Helvetica').fontSize(10);
  const nombreTop = y + 26;
  const nombreBoxW = autW - 94;
  const nombreHeight = doc.heightOfString(nombreAut, { width: nombreBoxW });
  doc.text(nombreAut, autX + 78, nombreTop, { width: nombreBoxW });

  // ENTIDAD debajo, sin chocar
  const entidadY = nombreTop + Math.max(16, nombreHeight) + 6;
  doc.font('Helvetica-Bold').fontSize(9).text('ENTIDAD:', autX + 8, entidadY);
  doc.font('Helvetica').fontSize(10).text(entidadAut, autX + 78, entidadY - 2, { width: nombreBoxW });

  // 9.3 Seguimiento y control (izquierda, debajo del responsable)
  const yLeftBottom = y + H_SIGN + GAP; // fila de abajo (solo en la izquierda)
  signatureBlock(
      doc,
      m,
      yLeftBottom,
      colW,
      H_SIGN,
      'RESPONSABLE DEL SEGUIMIENTO Y CONTROL',
      fitText(doc, nombreSeguimiento, colW - 24, 10),
      undefined
  );

  // Avanzamos el cursor vertical a la parte inferior de la sección de firmas
  y = y + autH + GAP;

  // 10) Pie de página
  doc.font('Helvetica').fontSize(8).text(
      'ORIGINAL: RESPONSABLE DEL CONTROL PATRIMONIAL    COPIA: RESPONSABLE DEL BIEN',
      m,
      doc.page.height - MARGINS.bottom - 10,
      { width: usableW, align: 'left' }
  );

  doc.end();
}
