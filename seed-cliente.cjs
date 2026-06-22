// Helper de desarrollo (no se commitea): crea un cliente de demo en la primera
// organización, para poder probar Estrategia + Calendario mientras el módulo de
// Clientes (slice masita) todavía no está en develop.
// Uso: node seed-cliente.cjs   (después de iniciar sesión y crear tu agencia)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const org = await prisma.organizacion.findFirst({ orderBy: { creadoEn: 'asc' } });
  if (!org) {
    console.log('⚠️  No hay ninguna organización. Iniciá sesión en la app y creá tu agencia primero.');
    process.exit(1);
  }
  const cliente = await prisma.cliente.create({
    data: {
      nombre: 'Café del Centro (demo)',
      rubro: 'Gastronomía',
      descripcion: 'Cliente de prueba para testear estrategia y calendario.',
      organizacionId: org.id,
    },
  });
  console.log(`✓ Cliente de demo creado en la organización "${org.nombre}".`);
  console.log(`  clienteId = ${cliente.id}`);
  console.log('  Pegá ese id en la pantalla de Estrategia de marca.');
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
