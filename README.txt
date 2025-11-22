# Hospital Inventarios — v2 (Ubicaciones + Fechas + Excel)
## Novedades
- Catálogo **Ubicaciones** (foráneo en Inventario).
- Filtros por **rango de fechas** (fecha de adjudicación).
- **Exportar a Excel** (botón en inventario).
## Requisitos
Docker y Docker Compose; puertos 3306, 8080, 8000, 8081 libres.
## 1) Levantar
docker compose build
docker compose up -d
## 2) Sincronizar schema + seeds
docker compose exec api sh -lc "npx prisma db push"
docker compose exec api sh -lc "ts-node prisma/seed.ts"
## Accesos
Web: http://localhost:8081
API: http://localhost:8000
Adminer: http://localhost:8080 (Server: db, User: root, Pass: root)
Admin inicial: admin@demo.local / admin123
