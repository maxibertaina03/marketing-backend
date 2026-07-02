-- El flujo de Instagram Login no usa Página de Facebook: pageId pasa a ser opcional.
ALTER TABLE "conexiones_meta" ALTER COLUMN "pageId" DROP NOT NULL;
