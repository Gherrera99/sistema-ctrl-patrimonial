-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'COLABORADOR', 'CONTROL_PATRIMONIAL', 'AUXILIAR_PATRIMONIAL', 'MANTENIMIENTO', 'TECNOLOGIAS') NOT NULL DEFAULT 'COLABORADOR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstadoFisico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 99,

    UNIQUE INDEX `EstadoFisico_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ubicacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 99,

    UNIQUE INDEX `Ubicacion_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClasificacionBien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sigla` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NULL,

    UNIQUE INDEX `ClasificacionBien_sigla_key`(`sigla`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `no_inventario` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `consecutivo` INTEGER NULL,
    `cuenta` VARCHAR(100) NULL,
    `otras_observaciones` VARCHAR(191) NULL,
    `costo_adquisicion` DECIMAL(12, 2) NULL,
    `clasificacionId` INTEGER NULL,
    `responsable` VARCHAR(255) NOT NULL,
    `rfc` VARCHAR(25) NOT NULL,
    `no_factura` VARCHAR(30) NULL,
    `fecha_adjudicacion` DATETIME(3) NULL,
    `modelo` VARCHAR(255) NULL,
    `marca` VARCHAR(255) NULL,
    `no_serie` VARCHAR(255) NULL,
    `observaciones` VARCHAR(191) NULL,
    `fecha_entrega` DATETIME(3) NULL,
    `estadoLogico` ENUM('ACTIVO', 'EN_DICTAMEN', 'BAJA') NOT NULL DEFAULT 'ACTIVO',
    `fotoUrl` VARCHAR(500) NULL,
    `tipo_bien` ENUM('ADMINISTRATIVO', 'MEDICO') NOT NULL DEFAULT 'ADMINISTRATIVO',
    `estadoId` INTEGER NULL,
    `ubicacionId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryItem_no_inventario_key`(`no_inventario`),
    INDEX `InventoryItem_no_inventario_idx`(`no_inventario`),
    INDEX `InventoryItem_responsable_idx`(`responsable`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthorizerGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` ENUM('ADMINISTRATIVO', 'MEDICO') NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AuthorizerGroup_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Authorizer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTo` DATETIME(3) NULL,
    `groupId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimientoBien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bienId` INTEGER NOT NULL,
    `tipo` ENUM('CAMBIO_RESPONSABLE', 'CAMBIO_UBICACION', 'OTRO') NOT NULL,
    `motivo` VARCHAR(500) NOT NULL,
    `responsableAntes` VARCHAR(255) NULL,
    `responsableDespues` VARCHAR(255) NULL,
    `ubicacionAntes` VARCHAR(255) NULL,
    `ubicacionDespues` VARCHAR(255) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DictamenBien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bienId` INTEGER NOT NULL,
    `tipo` ENUM('ADMINISTRATIVO', 'INFORMATICA', 'OTRO') NOT NULL,
    `coordinacion` VARCHAR(255) NULL,
    `unidadAdscripcion` VARCHAR(255) NULL,
    `ubicacionFisica` VARCHAR(255) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dictamenTexto` VARCHAR(191) NOT NULL,
    `estado` ENUM('BORRADOR', 'FIRMADO', 'CANCELADO') NOT NULL DEFAULT 'BORRADOR',
    `creadoPorId` INTEGER NOT NULL,
    `firmadoPor` VARCHAR(255) NULL,
    `puestoFirmante` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArchivoBien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bienId` INTEGER NOT NULL,
    `tipo` ENUM('FACTURA', 'COMPROBANTE_ADQUISICION', 'DICTAMEN_COMPLEMENTARIO', 'OFICIO_BAJA', 'FOTO', 'OTRO') NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedById` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_clasificacionId_fkey` FOREIGN KEY (`clasificacionId`) REFERENCES `ClasificacionBien`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_estadoId_fkey` FOREIGN KEY (`estadoId`) REFERENCES `EstadoFisico`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_ubicacionId_fkey` FOREIGN KEY (`ubicacionId`) REFERENCES `Ubicacion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Authorizer` ADD CONSTRAINT `Authorizer_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `AuthorizerGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoBien` ADD CONSTRAINT `MovimientoBien_bienId_fkey` FOREIGN KEY (`bienId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimientoBien` ADD CONSTRAINT `MovimientoBien_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DictamenBien` ADD CONSTRAINT `DictamenBien_bienId_fkey` FOREIGN KEY (`bienId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DictamenBien` ADD CONSTRAINT `DictamenBien_creadoPorId_fkey` FOREIGN KEY (`creadoPorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivoBien` ADD CONSTRAINT `ArchivoBien_bienId_fkey` FOREIGN KEY (`bienId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArchivoBien` ADD CONSTRAINT `ArchivoBien_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
