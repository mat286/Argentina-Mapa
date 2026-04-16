/**
 * Diccionario de equivalencias para matching de provincias.
 * Mapea nombres normalizados (sin acentos, uppercase) a un ID canónico que
 * coincide con el "nombre" del GeoJSON del IGN.
 */
const PROVINCE_ALIASES = {
  // CABA
  'CIUDAD AUTONOMA DE BUENOS AIRES': 'Ciudad Autónoma de Buenos Aires',
  'CABA': 'Ciudad Autónoma de Buenos Aires',
  'C.A.B.A': 'Ciudad Autónoma de Buenos Aires',
  'C.A.B.A.': 'Ciudad Autónoma de Buenos Aires',
  'CAPITAL FEDERAL': 'Ciudad Autónoma de Buenos Aires',
  'CAPITAL': 'Ciudad Autónoma de Buenos Aires',
  'C.F.': 'Ciudad Autónoma de Buenos Aires',

  // Buenos Aires
  'BUENOS AIRES': 'Buenos Aires',
  'BS. AS.': 'Buenos Aires',
  'BS AS': 'Buenos Aires',
  'BUE': 'Buenos Aires',
  'PBA': 'Buenos Aires',
  'PCIA. DE BUENOS AIRES': 'Buenos Aires',
  'PCIA DE BUENOS AIRES': 'Buenos Aires',

  // Catamarca
  'CATAMARCA': 'Catamarca',

  // Chaco
  'CHACO': 'Chaco',

  // Chubut
  'CHUBUT': 'Chubut',

  // Córdoba
  'CORDOBA': 'Córdoba',
  'CÓRDOBA': 'Córdoba',
  'CBA': 'Córdoba',

  // Corrientes
  'CORRIENTES': 'Corrientes',

  // Entre Ríos
  'ENTRE RIOS': 'Entre Ríos',
  'ENTRERÍOS': 'Entre Ríos',
  'E. RIOS': 'Entre Ríos',

  // Formosa
  'FORMOSA': 'Formosa',

  // Jujuy
  'JUJUY': 'Jujuy',

  // La Pampa
  'LA PAMPA': 'La Pampa',

  // La Rioja
  'LA RIOJA': 'La Rioja',

  // Mendoza
  'MENDOZA': 'Mendoza',

  // Misiones
  'MISIONES': 'Misiones',

  // Neuquén
  'NEUQUEN': 'Neuquén',
  'NEUQUÉN': 'Neuquén',

  // Río Negro
  'RIO NEGRO': 'Río Negro',
  'RÍO NEGRO': 'Río Negro',

  // Salta
  'SALTA': 'Salta',

  // San Juan
  'SAN JUAN': 'San Juan',

  // San Luis
  'SAN LUIS': 'San Luis',

  // Santa Cruz
  'SANTA CRUZ': 'Santa Cruz',

  // Santa Fe
  'SANTA FE': 'Santa Fe',

  // Santiago del Estero
  'SANTIAGO DEL ESTERO': 'Santiago del Estero',
  'SGO. DEL ESTERO': 'Santiago del Estero',
  'STGO. DEL ESTERO': 'Santiago del Estero',
  'STGO DEL ESTERO': 'Santiago del Estero',

  // Tierra del Fuego (el GeoJSON dice "Tierra del Fuego, Antártida e Islas del Atlántico Sur")
  'TIERRA DEL FUEGO': 'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
  'TIERRA DEL FUEGO, ANTARTIDA E ISLAS DEL ATLANTICO SUR': 'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
  'TDF': 'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
  'T. DEL FUEGO': 'Tierra del Fuego, Antártida e Islas del Atlántico Sur',

  // Islas Malvinas
  'ISLAS MALVINAS': 'Islas Malvinas',
  'MALVINAS': 'Islas Malvinas',
  'ISLAS MALVINAS (ARG.)': 'Islas Malvinas',
  'ISLAS MALVINAS (ARGENTINA)': 'Islas Malvinas',
  'FALKLAND': 'Islas Malvinas',
  'FALKLAND ISLANDS': 'Islas Malvinas',

  // Tucumán
  'TUCUMAN': 'Tucumán',
  'TUCUMÁN': 'Tucumán',
};

/**
 * Normaliza un string: trim, uppercase, remueve acentos.
 */
function normalize(str) {
  return str
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Distancia de Levenshtein entre dos strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Intenta emparejar un nombre de provincia del Excel con un nombre del GeoJSON.
 *
 * @param {string} input - Nombre del Excel
 * @param {string[]} geoNames - Lista de nombres del GeoJSON
 * @returns {{ match: string|null, score: 'exact'|'alias'|'fuzzy'|null, reason: string }}
 */
export function matchProvince(input, geoNames) {
  const normalized = normalize(input);

  // 1. Coincidencia directa por alias
  // Normalizamos las claves del diccionario para comparar sin acentos
  for (const [alias, canonical] of Object.entries(PROVINCE_ALIASES)) {
    if (normalize(alias) === normalized) {
      return { match: canonical, score: 'alias', reason: 'Coincidencia por diccionario' };
    }
  }

  // 2. Coincidencia exacta con nombres del GeoJSON (sin acentos)
  for (const geoName of geoNames) {
    if (normalize(geoName) === normalized) {
      return { match: geoName, score: 'exact', reason: 'Coincidencia exacta' };
    }
  }

  // 3. Coincidencia parcial: el input está contenido en el nombre del GeoJSON o viceversa
  for (const geoName of geoNames) {
    const geoNorm = normalize(geoName);
    if (geoNorm.includes(normalized) || normalized.includes(geoNorm)) {
      return { match: geoName, score: 'fuzzy', reason: 'Coincidencia parcial' };
    }
  }

  // 4. Fuzzy matching (Levenshtein <= 2)
  let bestMatch = null;
  let bestDist = Infinity;
  for (const geoName of geoNames) {
    const dist = levenshtein(normalized, normalize(geoName));
    if (dist < bestDist && dist <= 2) {
      bestDist = dist;
      bestMatch = geoName;
    }
  }
  if (bestMatch) {
    return {
      match: bestMatch,
      score: 'fuzzy',
      reason: `Coincidencia aproximada (distancia: ${bestDist})`,
    };
  }

  return { match: null, score: null, reason: 'Sin coincidencia encontrada' };
}

/**
 * Empareja todos los datos del Excel con nombres del GeoJSON.
 *
 * @param {Array<{name: string, value: number, row: number}>} excelData
 * @param {string[]} geoNames - Nombres de provincias del GeoJSON
 * @returns {{ matched: Array, unmatched: Array }}
 */
export function matchAllProvinces(excelData, geoNames) {
  const matched = [];
  const unmatched = [];
  const usedGeoNames = new Set();

  for (const item of excelData) {
    const result = matchProvince(item.name, geoNames);
    if (result.match) {
      // Verificar duplicados
      if (usedGeoNames.has(result.match)) {
        unmatched.push({
          ...item,
          reason: `Duplicado: "${result.match}" ya fue asignado a otra fila`,
        });
      } else {
        usedGeoNames.add(result.match);
        matched.push({
          provinceName: result.match,
          originalName: item.name,
          value: item.value,
          row: item.row,
          matchScore: result.score,
          matchReason: result.reason,
        });
      }
    } else {
      unmatched.push({
        ...item,
        reason: result.reason,
      });
    }
  }

  return { matched, unmatched };
}
