import * as XLSX from 'xlsx';

/**
 * Parsea un archivo Excel y extrae los datos de provincias.
 * Busca las columnas "Desc. Ubicación Geográfica" y "Total".
 * Ignora la fila donde la ubicación sea "Total".
 * Convierte formato numérico argentino (1.234,56) a Number.
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          reject(new Error('El archivo Excel está vacío.'));
          return;
        }

        // Detectar columnas
        const headers = Object.keys(rows[0]);
        const nameCol = headers.find(
          (h) =>
            h.toLowerCase().includes('ubicación') ||
            h.toLowerCase().includes('ubicacion') ||
            h.toLowerCase().includes('provincia') ||
            h.toLowerCase().includes('desc.')
        );
        const valueCol = headers.find(
          (h) => h.toLowerCase() === 'total' || h.toLowerCase().includes('total')
        );

        if (!nameCol) {
          reject(
            new Error(
              `No se encontró la columna de provincia. Columnas disponibles: ${headers.join(', ')}`
            )
          );
          return;
        }
        if (!valueCol) {
          reject(
            new Error(
              `No se encontró la columna "Total". Columnas disponibles: ${headers.join(', ')}`
            )
          );
          return;
        }

        const results = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rawName = String(row[nameCol]).trim();
          const rawValue = row[valueCol];

          // Ignorar fila "Total"
          if (rawName.toLowerCase() === 'total') continue;
          // Ignorar filas vacías
          if (!rawName) continue;

          const numValue = parseArgentineNumber(rawValue);

          if (numValue === null || isNaN(numValue)) {
            errors.push({
              row: i + 2, // +2 por header y base-1
              name: rawName,
              rawValue: String(rawValue),
              reason: `Valor no numérico: "${rawValue}"`,
            });
          } else {
            results.push({
              name: rawName,
              value: numValue,
              row: i + 2,
            });
          }
        }

        resolve({ data: results, errors, nameCol, valueCol });
      } catch (err) {
        reject(new Error(`Error al leer el archivo: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convierte un valor con formato argentino (1.234,56) o estándar a Number.
 * Soporta: "1.234,56" -> 1234.56, "1234.56" -> 1234.56, 1234 -> 1234
 */
export function parseArgentineNumber(value) {
  if (typeof value === 'number') return value;
  if (value == null || value === '') return null;

  let str = String(value).trim();

  // Detectar formato argentino: tiene puntos como miles y coma como decimal
  // Ejemplo: "224.942,98" o "1.234.567,89"
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) {
    // Formato argentino: quitar puntos de miles, reemplazar coma por punto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+(,\d+)?$/.test(str)) {
    // Solo coma decimal sin puntos de miles: "1234,56"
    str = str.replace(',', '.');
  }
  // Si ya es formato estándar (con punto decimal), no hacer nada

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}
