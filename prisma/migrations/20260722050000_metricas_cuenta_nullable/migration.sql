-- Distinguir "Instagram no da la métrica" (NULL) de "hubo cero" (0).
ALTER TABLE "metricas_cuenta" ALTER COLUMN "alcance" DROP NOT NULL,
                              ALTER COLUMN "alcance" DROP DEFAULT,
                              ALTER COLUMN "vistas" DROP NOT NULL,
                              ALTER COLUMN "vistas" DROP DEFAULT,
                              ALTER COLUMN "visitasPerfil" DROP NOT NULL,
                              ALTER COLUMN "visitasPerfil" DROP DEFAULT,
                              ALTER COLUMN "seguidores" DROP NOT NULL,
                              ALTER COLUMN "seguidores" DROP DEFAULT;

-- Lo ya guardado como 0 en estas tres nunca se pidió realmente a Instagram:
-- lo pasamos a NULL para no mostrar un cero inventado.
UPDATE "metricas_cuenta" SET "vistas" = NULL, "visitasPerfil" = NULL, "seguidores" = NULL;
