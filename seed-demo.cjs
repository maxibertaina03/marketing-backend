// Seed de demo: puebla TU organización (la primera) con datos realistas de una
// agencia de marketing para probar el sistema de punta a punta.
// Uso: node seed-demo.cjs   (con la app levantada y habiendo creado tu agencia)
//
// Es idempotente: borra los clientes de demo previos de la org y los recrea.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fecha base: hoy. Las publicaciones se reparten alrededor de esta fecha.
const HOY = new Date();
function enDias(n, hora = 10) {
  const d = new Date(HOY);
  d.setDate(d.getDate() + n);
  d.setHours(hora, 0, 0, 0);
  return d;
}

async function main() {
  const org = await prisma.organizacion.findFirst({ orderBy: { creadoEn: 'asc' } });
  if (!org) {
    console.log('⚠️  No hay ninguna organización. Iniciá sesión en la app y creá tu agencia primero.');
    process.exit(1);
  }
  console.log(`Poblando la organización "${org.nombre}" (${org.id})…`);

  // Limpieza idempotente: borrar clientes previos (cascada a estrategias y publicaciones).
  await prisma.cliente.deleteMany({ where: { organizacionId: org.id } });

  // ---- CLIENTES ----------------------------------------------------------
  const cafe = await prisma.cliente.create({
    data: {
      organizacionId: org.id,
      nombre: 'Café del Centro',
      rubro: 'Gastronomía',
      descripcion: 'Cafetería de especialidad en el microcentro, ambiente cálido y pastelería artesanal.',
      ubicacion: 'Córdoba, Argentina',
      sitioWeb: 'https://cafedelcentro.com.ar',
      contactoNombre: 'Juana Pérez',
      contactoEmail: 'juana@cafedelcentro.com.ar',
      contactoTelefono: '+54 351 555-1010',
      redes: { instagram: '@cafedelcentro', facebook: 'cafedelcentro', tiktok: '@cafedelcentro' },
      paletaColores: ['#6F4E37', '#C0A080', '#2E1A12'],
      tono: 'Cercano, cálido y descontracturado',
      publicoObjetivo: 'Adultos jóvenes 25-40, amantes del café de especialidad y el trabajo remoto.',
      productosServicios: 'Café de especialidad, pastelería artesanal, brunch de fin de semana.',
      objetivos: 'Aumentar reservas de fin de semana y ventas de grano para llevar.',
      competencia: 'Otras cafeterías de especialidad del centro.',
      promociones: '2x1 en cafés los martes; 10% off en grano para suscriptores.',
      estado: 'ACTIVO',
    },
  });

  const gym = await prisma.cliente.create({
    data: {
      organizacionId: org.id,
      nombre: 'FitZone Gym',
      rubro: 'Fitness',
      descripcion: 'Gimnasio boutique con clases funcionales y entrenamiento personalizado.',
      ubicacion: 'Rosario, Argentina',
      sitioWeb: 'https://fitzone.fit',
      contactoNombre: 'Marcos Díaz',
      contactoEmail: 'marcos@fitzone.fit',
      contactoTelefono: '+54 341 555-2020',
      redes: { instagram: '@fitzonegym', tiktok: '@fitzone' },
      paletaColores: ['#111827', '#22C55E'],
      tono: 'Motivacional y enérgico',
      publicoObjetivo: 'Personas 20-45 que buscan resultados y comunidad.',
      productosServicios: 'Clases funcionales, musculación, planes personalizados, asesoría nutricional.',
      objetivos: 'Sumar 50 socios nuevos en el trimestre.',
      competencia: 'Cadenas de gimnasios y estudios funcionales.',
      promociones: 'Primera clase gratis; plan anual con 2 meses bonificados.',
      estado: 'ACTIVO',
    },
  });

  const moda = await prisma.cliente.create({
    data: {
      organizacionId: org.id,
      nombre: 'Bloom Indumentaria',
      rubro: 'Moda',
      descripcion: 'Marca de indumentaria femenina sustentable, producción local de bajo impacto.',
      ubicacion: 'Buenos Aires, Argentina',
      sitioWeb: 'https://bloom.com.ar',
      contactoNombre: 'Sofía Romero',
      contactoEmail: 'sofia@bloom.com.ar',
      contactoTelefono: '+54 11 5555-3030',
      redes: { instagram: '@bloom.indumentaria', tiktok: '@bloomar', facebook: 'bloomindumentaria' },
      paletaColores: ['#E8B4BC', '#7D5260', '#FFFFFF'],
      tono: 'Inspirador, femenino y consciente',
      publicoObjetivo: 'Mujeres 22-38 interesadas en moda con valores sustentables.',
      productosServicios: 'Colecciones cápsula, prendas atemporales, accesorios.',
      objetivos: 'Lanzar la colección primavera y crecer en ventas online.',
      competencia: 'Marcas de fast fashion y diseño de autor.',
      promociones: 'Envío gratis en la primera compra; preventa para suscriptoras.',
      estado: 'POTENCIAL',
    },
  });

  // Un cliente extra para mostrar filtros/estados.
  await prisma.cliente.create({
    data: {
      organizacionId: org.id,
      nombre: 'Clínica Dental Sonríe',
      rubro: 'Salud',
      descripcion: 'Consultorio odontológico integral con foco en estética dental.',
      ubicacion: 'Mendoza, Argentina',
      contactoNombre: 'Dr. Luis Gómez',
      contactoEmail: 'contacto@sonrie.com.ar',
      redes: { instagram: '@clinicasonrie' },
      paletaColores: ['#0EA5E9', '#FFFFFF'],
      tono: 'Profesional y confiable',
      publicoObjetivo: 'Familias y adultos que buscan odontología de calidad.',
      productosServicios: 'Limpieza, ortodoncia, implantes, blanqueamiento.',
      objetivos: 'Generar turnos para tratamientos de estética dental.',
      estado: 'PAUSADO',
    },
  });

  // ---- ESTRATEGIAS DE MARCA ---------------------------------------------
  const estCafe = await prisma.estrategiaDeMarca.create({
    data: {
      organizacionId: org.id,
      clienteId: cafe.id,
      nombre: 'Café del Centro — Invierno 2026',
      objetivo: 'Posicionar al café como el punto de encuentro para trabajar y reunirse en el centro, impulsando el consumo en días de semana.',
      publicoObjetivo: 'Profesionales y estudiantes de 25-40 años que valoran un buen café y un espacio para trabajar.',
      tono: 'CERCANO',
      pilares: ['Café de especialidad', 'Espacio para trabajar', 'Comunidad', 'Pastelería artesanal'],
      restricciones: 'Evitar lenguaje demasiado técnico sobre el café; mantener calidez.',
    },
  });

  const estGym = await prisma.estrategiaDeMarca.create({
    data: {
      organizacionId: org.id,
      clienteId: gym.id,
      nombre: 'FitZone — Captación trimestral',
      objetivo: 'Atraer socios nuevos mostrando resultados reales y el ambiente de comunidad del gimnasio.',
      publicoObjetivo: 'Personas de 20-45 que quieren empezar a entrenar y buscan acompañamiento.',
      tono: 'INSPIRADOR',
      pilares: ['Resultados', 'Comunidad', 'Entrenamiento profesional', 'Constancia'],
      restricciones: 'No prometer resultados irreales ni usar presión sobre el cuerpo.',
    },
  });

  const estModa = await prisma.estrategiaDeMarca.create({
    data: {
      organizacionId: org.id,
      clienteId: moda.id,
      nombre: 'Bloom — Lanzamiento Primavera',
      objetivo: 'Lanzar la colección primavera comunicando el valor sustentable y la producción local.',
      publicoObjetivo: 'Mujeres 22-38 con interés en moda consciente y diseño.',
      tono: 'INSPIRADOR',
      pilares: ['Sustentabilidad', 'Producción local', 'Diseño atemporal', 'Identidad femenina'],
      restricciones: 'No usar fast fashion como referencia aspiracional.',
    },
  });

  // ---- PUBLICACIONES (calendario) ---------------------------------------
  const publicaciones = [
    // Café
    { est: estCafe, titulo: 'Nuevo blend de invierno', contenido: 'Presentamos nuestro blend de temporada: notas a chocolate y avellana. ☕', canal: 'INSTAGRAM', estado: 'PUBLICADO', fecha: enDias(-8) },
    { est: estCafe, titulo: 'Martes 2x1', contenido: 'Todos los martes, 2x1 en cafés de especialidad. Traé a alguien. 🤝', canal: 'INSTAGRAM', estado: 'PUBLICADO', fecha: enDias(-3) },
    { est: estCafe, titulo: 'Reel: latte art', contenido: 'Time-lapse de nuestro barista haciendo latte art. 🎨', canal: 'TIKTOK', estado: 'PROGRAMADO', fecha: enDias(2) },
    { est: estCafe, titulo: 'Brunch de domingo', contenido: 'Carrusel con las opciones del brunch de fin de semana.', canal: 'INSTAGRAM', estado: 'APROBADO', fecha: enDias(4) },
    { est: estCafe, titulo: 'Historia: encuesta de medialunas', contenido: '¿Clásicas o rellenas? Encuesta en stories.', canal: 'INSTAGRAM', estado: 'BORRADOR', fecha: enDias(6) },
    // Gym
    { est: estGym, titulo: 'Primera clase gratis', contenido: 'Tu primera clase funcional es gratis. Reservá por DM. 💪', canal: 'INSTAGRAM', estado: 'PUBLICADO', fecha: enDias(-5) },
    { est: estGym, titulo: 'Testimonio de socio', contenido: 'Video: la transformación de Pablo en 3 meses.', canal: 'TIKTOK', estado: 'EN_REVISION', fecha: enDias(1) },
    { est: estGym, titulo: 'Rutina de 15 minutos', contenido: 'Reel con una rutina express para hacer en casa.', canal: 'TIKTOK', estado: 'PROGRAMADO', fecha: enDias(3) },
    { est: estGym, titulo: 'Plan anual promo', contenido: 'Plan anual con 2 meses bonificados. Solo esta semana.', canal: 'FACEBOOK', estado: 'APROBADO', fecha: enDias(5) },
    // Bloom
    { est: estModa, titulo: 'Teaser colección primavera', contenido: 'Algo nuevo está floreciendo. 🌸 Preventa exclusiva para suscriptoras.', canal: 'INSTAGRAM', estado: 'PROGRAMADO', fecha: enDias(2) },
    { est: estModa, titulo: 'Detrás de escena producción local', contenido: 'Carrusel mostrando el taller y las manos detrás de cada prenda.', canal: 'INSTAGRAM', estado: 'EN_REVISION', fecha: enDias(4) },
    { est: estModa, titulo: 'Lookbook primavera', contenido: 'Reel con los looks principales de la colección.', canal: 'TIKTOK', estado: 'BORRADOR', fecha: enDias(7) },
    { est: estModa, titulo: 'Lanzamiento oficial', contenido: 'La colección primavera ya está disponible online. Envío gratis. 🚚', canal: 'INSTAGRAM', estado: 'BORRADOR', fecha: enDias(9) },
  ];

  for (const p of publicaciones) {
    await prisma.publicacion.create({
      data: {
        organizacionId: org.id,
        clienteId: p.est.clienteId,
        estrategiaId: p.est.id,
        titulo: p.titulo,
        contenido: p.contenido,
        canal: p.canal,
        estado: p.estado,
        fechaProgramada: p.fecha,
      },
    });
  }

  // ---- INVITACIÓN DE EQUIPO (pendiente) ---------------------------------
  await prisma.invitacion.upsert({
    where: { organizacionId_email: { organizacionId: org.id, email: 'disenador@agencia.com' } },
    update: { rol: 'DISENADOR' },
    create: { organizacionId: org.id, email: 'disenador@agencia.com', rol: 'DISENADOR' },
  });

  const resumen = {
    clientes: await prisma.cliente.count({ where: { organizacionId: org.id } }),
    estrategias: await prisma.estrategiaDeMarca.count({ where: { organizacionId: org.id } }),
    publicaciones: await prisma.publicacion.count({ where: { organizacionId: org.id } }),
    invitaciones: await prisma.invitacion.count({ where: { organizacionId: org.id } }),
  };
  console.log('✓ Datos de demo cargados:', resumen);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
