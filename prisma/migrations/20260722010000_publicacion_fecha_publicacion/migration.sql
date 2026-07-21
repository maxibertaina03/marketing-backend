-- Momento en que la publicación se publicó realmente en la red social.
ALTER TABLE "publicaciones" ADD COLUMN "fechaPublicacion" TIMESTAMP(3);
