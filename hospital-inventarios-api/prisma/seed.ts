// hospital-inventarios-api/prisma/seed.ts
import { PrismaClient, Role, TipoBien } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Usuario admin (hash de "admin123")
  await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@demo.local',
      password: '$2b$10$CXRlwW33vdQka3a/XFYyy.Z5ZuHxwz8vKX3SnKZFCTajXuOYIxibK',
      role: Role.ADMIN,
    },
  });

  // Estados físicos
  const estados = [
    { code: 'NUEVO', label: 'Nuevo', orden: 1 },
    { code: 'EXCELENTE', label: 'Excelente', orden: 2 },
    { code: 'MUY_BUENO', label: 'Muy bueno', orden: 3 },
    { code: 'BUENO', label: 'Bueno', orden: 4 },
    { code: 'REGULAR', label: 'Regular', orden: 5 },
    { code: 'MALO', label: 'Malo', orden: 6 },
    { code: 'INSERVIBLE', label: 'Inservible', orden: 7 },
    { code: 'EN_REPARACION', label: 'En reparación', orden: 8 },
    { code: 'BAJA', label: 'Baja', orden: 9 },
  ];
  for (const e of estados) {
    await prisma.estadoFisico.upsert({
      where: { code: e.code },
      update: { label: e.label, orden: e.orden },
      create: e,
    });
  }

  // Ubicaciones (usa 'nombre', NO 'name')
  const ubicaciones = [
    { code: 'ADM_OFICINAS', nombre: 'Oficinas Administrativas', orden: 1 },
    { code: 'ALMACEN', nombre: 'Almacén', orden: 2 },
    { code: 'URGENCIAS', nombre: 'Urgencias', orden: 3 },
    { code: 'QUIROFANO', nombre: 'Quirófano', orden: 4 },
    { code: 'LABORATORIO', nombre: 'Laboratorio', orden: 5 },
  ];
  for (const u of ubicaciones) {
    await prisma.ubicacion.upsert({
      where: { code: u.code },
      update: { nombre: u.nombre, orden: u.orden },
      create: u,
    });
  }

  // Grupos de autorizadores (enums MAYÚSCULAS)
  const adminGrp = await prisma.authorizerGroup.upsert({
    where: { code: TipoBien.ADMINISTRATIVO },
    update: { name: 'Dirección Administrativa' },
    create: { code: TipoBien.ADMINISTRATIVO, name: 'Dirección Administrativa' },
  });
  const medGrp = await prisma.authorizerGroup.upsert({
    where: { code: TipoBien.MEDICO },
    update: { name: 'Dirección Médica' },
    create: { code: TipoBien.MEDICO, name: 'Dirección Médica' },
  });

  // Autorizadores (uno activo por grupo)
  await prisma.authorizer.upsert({
    where: { id: 1 },
    update: {
      fullName: 'C.P. Mariana Guadalupe Lira Ponce',
      title: 'AUTORIZÓ DIRECTOR ADMINISTRATIVO',
      entity: process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD',
      active: true,
      groupId: adminGrp.id,
    },
    create: {
      fullName: 'C.P. Mariana Guadalupe Lira Ponce',
      title: 'AUTORIZÓ DIRECTOR ADMINISTRATIVO',
      entity: process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD',
      active: true,
      groupId: adminGrp.id,
    },
  });

  await prisma.authorizer.upsert({
    where: { id: 2 },
    update: {
      fullName: 'Dr. Nombre Apellido',
      title: 'AUTORIZÓ DIRECTOR MÉDICO',
      entity: process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD',
      active: true,
      groupId: medGrp.id,
    },
    create: {
      fullName: 'Dr. Nombre Apellido',
      title: 'AUTORIZÓ DIRECTOR MÉDICO',
      entity: process.env.PDF_HEADER_ENTITY || 'HOSPITAL DE LA AMISTAD',
      active: true,
      groupId: medGrp.id,
    },
  });
}

// ✅ Configuración de Dictamen (Mantenimiento / TI)
await prisma.dictamenConfig.upsert({
    where: { coordinacion: 'MANTENIMIENTO' },
    update: {
        tituloCoordinacion: 'COORDINACIÓN DE MANTENIMIENTO',
        firmanteNombre: 'NOMBRE COORDINADOR MANTENIMIENTO',
        firmantePuesto: 'COORDINADOR DE MANTENIMIENTO',
        active: true,
    },
    create: {
        coordinacion: 'MANTENIMIENTO',
        tituloCoordinacion: 'COORDINACIÓN DE MANTENIMIENTO',
        firmanteNombre: 'NOMBRE COORDINADOR MANTENIMIENTO',
        firmantePuesto: 'COORDINADOR DE MANTENIMIENTO',
        active: true,
    },
});

await prisma.dictamenConfig.upsert({
    where: { coordinacion: 'TECNOLOGIAS' },
    update: {
        tituloCoordinacion: 'COORDINACIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN',
        firmanteNombre: 'NOMBRE COORDINADOR TI',
        firmantePuesto: 'COORDINADOR DE TECNOLOGÍAS DE LA INFORMACIÓN',
        active: true,
    },
    create: {
        coordinacion: 'TECNOLOGIAS',
        tituloCoordinacion: 'COORDINACIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN',
        firmanteNombre: 'NOMBRE COORDINADOR TI',
        firmantePuesto: 'COORDINADOR DE TECNOLOGÍAS DE LA INFORMACIÓN',
        active: true,
    },
});


main()
    .then(async () => {
      console.log('✅ Seed completado');
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('❌ Error en seed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
