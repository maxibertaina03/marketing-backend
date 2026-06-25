-- CreateTable
CREATE TABLE "metricas_publicacion" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "publicacionId" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "fecha" DATE NOT NULL,
    "impresiones" INTEGER NOT NULL DEFAULT 0,
    "alcance" INTEGER NOT NULL DEFAULT 0,
    "meGusta" INTEGER NOT NULL DEFAULT 0,
    "comentarios" INTEGER NOT NULL DEFAULT 0,
    "compartidos" INTEGER NOT NULL DEFAULT 0,
    "guardados" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metricas_publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metricas_publicacion_organizacionId_idx" ON "metricas_publicacion"("organizacionId");

-- CreateIndex
CREATE INDEX "metricas_publicacion_clienteId_idx" ON "metricas_publicacion"("clienteId");

-- CreateIndex
CREATE INDEX "metricas_publicacion_fecha_idx" ON "metricas_publicacion"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_publicacion_publicacionId_fecha_key" ON "metricas_publicacion"("publicacionId", "fecha");

-- AddForeignKey
ALTER TABLE "metricas_publicacion" ADD CONSTRAINT "metricas_publicacion_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_publicacion" ADD CONSTRAINT "metricas_publicacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_publicacion" ADD CONSTRAINT "metricas_publicacion_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "publicaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
