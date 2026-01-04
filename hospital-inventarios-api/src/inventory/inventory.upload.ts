// hospital-inventarios-api/src/inventory/inventory.upload.ts
import multer from 'multer';
import fs from 'fs';
import path from 'path';

function safeName(name: string) {
    return name
        .replace(/[^\w.\-() ]+/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 120);
}

function makeUpload(subdir: 'bien' | 'resguardo') {
    const uploadRoot = path.join(process.cwd(), 'uploads', subdir);
    fs.mkdirSync(uploadRoot, { recursive: true });

    const storage = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadRoot),
        filename: (_req, file, cb) => {
            const fname = `${Date.now()}-${safeName(file.originalname)}`;
            cb(null, fname);
        },
    });

    return multer({
        storage,
        limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    });
}

export const uploadFactura = makeUpload('bien');
export const uploadResguardo = makeUpload('resguardo');
