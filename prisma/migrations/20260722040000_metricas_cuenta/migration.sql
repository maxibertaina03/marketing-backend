CREATE TABLE "metricas_cuenta" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "alcance" INTEGER NOT NULL DEFAULT 0,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "visitasPerfil" INTEGER NOT NULL DEFAULT 0,
    "seguidores" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metricas_cuenta_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "metricas_cuenta_organizacionId_idx" ON "metricas_cuenta"("organizacionId");
CREATE INDEX "metricas_cuenta_fecha_idx" ON "metricas_cuenta"("fecha");
CREATE UNIQUE INDEX "metricas_cuenta_clienteId_fecha_key" ON "metricas_cuenta"("clienteId", "fecha");
ALTER TABLE "metricas_cuenta" ADD CONSTRAINT "metricas_cuenta_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metricas_cuenta" ADD CONSTRAINT "metricas_cuenta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
