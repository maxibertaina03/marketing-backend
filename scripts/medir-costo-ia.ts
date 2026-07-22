/**
 * Mide el costo real por generación de IA con los datos que ya guardamos.
 *
 * `GeneracionIa` viene registrando desde la Fase 2 los tokens de cada llamada
 * (entrada, salida, escritura y lectura de caché). Con eso no hace falta estimar
 * nada: se puede calcular lo que cada botón cuesta de verdad, y recién ahí fijar
 * las cuotas de cada plan.
 *
 * Uso:
 *   DATABASE_URL="<url externa de la base>" npx ts-node scripts/medir-costo-ia.ts
 */
import { PrismaClient } from '@prisma/client';

/**
 * Precios en USD por millón de tokens.
 * Fuente: https://platform.claude.com/docs/en/about-claude/pricing (22/07/2026).
 * Si cambian, se actualizan acá y el informe se recalcula solo.
 */
const PRECIOS: Record<string, Precio> = {
  'claude-opus-4-8': { entrada: 5, salida: 25, cacheEscritura: 6.25, cacheLectura: 0.5 },
  'claude-sonnet-5': { entrada: 2, salida: 10, cacheEscritura: 2.5, cacheLectura: 0.2 },
  'claude-haiku-4-5-20251001': { entrada: 1, salida: 5, cacheEscritura: 1.25, cacheLectura: 0.1 },
};

interface Precio {
  entrada: number;
  salida: number;
  cacheEscritura: number;
  cacheLectura: number;
}

interface Tokens {
  entrada: number;
  salida: number;
  cacheEscritura: number;
  cacheLectura: number;
}

const MILLON = 1_000_000;

function costo(tokens: Tokens, precio: Precio): number {
  return (
    (tokens.entrada * precio.entrada +
      tokens.salida * precio.salida +
      tokens.cacheEscritura * precio.cacheEscritura +
      tokens.cacheLectura * precio.cacheLectura) /
    MILLON
  );
}

/** Formatea un costo chico sin que se vuelva "0.00". */
function usd(valor: number): string {
  if (valor === 0) return '$0';
  if (valor < 0.01) return `$${valor.toFixed(5)}`;
  return `$${valor.toFixed(4)}`;
}

function fila(celdas: string[], anchos: number[]): string {
  return celdas.map((c, i) => (i === 0 ? c.padEnd(anchos[i]) : c.padStart(anchos[i]))).join('  ');
}

async function main() {
  const prisma = new PrismaClient();

  const generaciones = await prisma.generacionIa.findMany({
    select: {
      tipoBoton: true,
      modelo: true,
      tokensEntrada: true,
      tokensSalida: true,
      tokensCacheCreacion: true,
      tokensCacheLectura: true,
      creadoEn: true,
    },
    orderBy: { creadoEn: 'asc' },
  });

  if (generaciones.length === 0) {
    console.log('No hay generaciones registradas todavía: no hay nada que medir.');
    await prisma.$disconnect();
    return;
  }

  const modelos = [...new Set(generaciones.map((g) => g.modelo))];
  const desconocidos = modelos.filter((m) => !PRECIOS[m]);
  if (desconocidos.length > 0) {
    console.log(`⚠️  Sin precio cargado para: ${desconocidos.join(', ')}. Se omiten del informe.\n`);
  }

  const usables = generaciones.filter((g) => PRECIOS[g.modelo]);

  console.log('═══ COSTO REAL DE IA ═══\n');
  console.log(`Generaciones registradas: ${generaciones.length}`);
  console.log(
    `Período: ${generaciones[0].creadoEn.toISOString().slice(0, 10)} → ` +
      `${generaciones[generaciones.length - 1].creadoEn.toISOString().slice(0, 10)}`,
  );
  console.log(`Modelos usados: ${modelos.join(', ')}\n`);

  // ─── Por tipo de botón ───
  const porBoton = new Map<string, { cantidad: number; tokens: Tokens; costo: number }>();
  for (const g of usables) {
    const actual = porBoton.get(g.tipoBoton) ?? {
      cantidad: 0,
      tokens: { entrada: 0, salida: 0, cacheEscritura: 0, cacheLectura: 0 },
      costo: 0,
    };
    const tokens: Tokens = {
      entrada: g.tokensEntrada,
      salida: g.tokensSalida,
      cacheEscritura: g.tokensCacheCreacion,
      cacheLectura: g.tokensCacheLectura,
    };
    actual.cantidad++;
    actual.tokens.entrada += tokens.entrada;
    actual.tokens.salida += tokens.salida;
    actual.tokens.cacheEscritura += tokens.cacheEscritura;
    actual.tokens.cacheLectura += tokens.cacheLectura;
    actual.costo += costo(tokens, PRECIOS[g.modelo]);
    porBoton.set(g.tipoBoton, actual);
  }

  const ANCHOS = [24, 6, 10, 10, 12, 12];
  console.log('─── Por botón ───');
  console.log(
    fila(['Botón', 'Usos', 'Tok. ent.', 'Tok. sal.', 'Costo prom.', 'Costo total'], ANCHOS),
  );
  const ordenados = [...porBoton.entries()].sort((a, b) => b[1].costo - a[1].costo);
  for (const [boton, datos] of ordenados) {
    console.log(
      fila(
        [
          boton,
          String(datos.cantidad),
          Math.round(datos.tokens.entrada / datos.cantidad).toLocaleString('es'),
          Math.round(datos.tokens.salida / datos.cantidad).toLocaleString('es'),
          usd(datos.costo / datos.cantidad),
          usd(datos.costo),
        ],
        ANCHOS,
      ),
    );
  }

  const costoTotal = [...porBoton.values()].reduce((t, d) => t + d.costo, 0);
  const cantidadTotal = [...porBoton.values()].reduce((t, d) => t + d.cantidad, 0);
  const promedio = costoTotal / cantidadTotal;
  const masCaro = ordenados.reduce((a, b) =>
    b[1].costo / b[1].cantidad > a[1].costo / a[1].cantidad ? b : a,
  );

  console.log(`\nCosto promedio por generación: ${usd(promedio)}`);
  console.log(
    `El más caro es ${masCaro[0]}: ${usd(masCaro[1].costo / masCaro[1].cantidad)} por uso.`,
  );

  // ─── Cuánto costaría cada cuota ───
  console.log('\n─── Costo mensual de IA por agencia, según la cuota ───');
  console.log('(al costo promedio actual, en el peor caso: la agencia agota la cuota)\n');
  console.log(fila(['Generaciones/mes', 'Costo IA', '% de Starter', '% de Agency'], [18, 12, 14, 14]));
  for (const cuota of [100, 250, 500, 1000, 2500]) {
    const costoMes = promedio * cuota;
    console.log(
      fila(
        [
          String(cuota),
          `$${costoMes.toFixed(2)}`,
          `${((costoMes / 29) * 100).toFixed(1)}%`,
          `${((costoMes / 79) * 100).toFixed(1)}%`,
        ],
        [18, 12, 14, 14],
      ),
    );
  }

  // ─── Qué pasaría cambiando de modelo ───
  console.log('\n─── El mismo trabajo con otro modelo ───');
  const totales: Tokens = { entrada: 0, salida: 0, cacheEscritura: 0, cacheLectura: 0 };
  for (const datos of porBoton.values()) {
    totales.entrada += datos.tokens.entrada;
    totales.salida += datos.tokens.salida;
    totales.cacheEscritura += datos.tokens.cacheEscritura;
    totales.cacheLectura += datos.tokens.cacheLectura;
  }
  for (const [modelo, precio] of Object.entries(PRECIOS)) {
    const total = costo(totales, precio);
    const porGeneracion = total / cantidadTotal;
    const diferencia = total / costoTotal;
    console.log(
      `  ${modelo.padEnd(28)} ${usd(porGeneracion).padStart(10)} por generación` +
        `   (${diferencia < 1 ? `${((1 - diferencia) * 100).toFixed(0)}% más barato` : diferencia > 1 ? `${((diferencia - 1) * 100).toFixed(0)}% más caro` : 'igual'})`,
    );
  }

  // ─── Cuánto está ahorrando el caché ───
  const sinCache = costo(
    {
      entrada: totales.entrada + totales.cacheEscritura + totales.cacheLectura,
      salida: totales.salida,
      cacheEscritura: 0,
      cacheLectura: 0,
    },
    PRECIOS[modelos[0]] ?? PRECIOS['claude-opus-4-8'],
  );
  if (totales.cacheLectura > 0) {
    console.log(
      `\nEl caché de contexto de marca está ahorrando ${((1 - costoTotal / sinCache) * 100).toFixed(0)}% ` +
        `(${usd(sinCache - costoTotal)} en total).`,
    );
  } else {
    console.log('\n⚠️  No hay lecturas de caché registradas: el caché no está funcionando.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
