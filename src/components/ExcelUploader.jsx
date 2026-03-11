import { useRef, useCallback } from 'react';
import useAppStore from '../state/useAppStore';
import { parseExcelFile } from '../utils/parseExcel';
import { matchAllProvinces } from '../utils/provinceMatching';
import geojsonData from '../data/argentina-provincias.json';

export default function ExcelUploader() {
  const inputRef = useRef(null);
  const setFileData = useAppStore((s) => s.setFileData);
  const setMatchingResults = useAppStore((s) => s.setMatchingResults);
  const fileName = useAppStore((s) => s.fileName);
  const parseErrors = useAppStore((s) => s.parseErrors);
  const unmatchedData = useAppStore((s) => s.unmatchedData);
  const isDataReady = useAppStore((s) => s.isDataReady);
  const resetAll = useAppStore((s) => s.resetAll);

  const geoNames = geojsonData.features.map((f) => f.properties.nombre);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const { data, errors, nameCol, valueCol } = await parseExcelFile(file);
        setFileData(file.name, data, errors);

        if (errors.length > 0) {
          // No continuar matching si hay errores de parseo
          setMatchingResults([], []);
          return;
        }

        // Matching
        const { matched, unmatched } = matchAllProvinces(data, geoNames);
        setMatchingResults(matched, unmatched);
      } catch (err) {
        setFileData(file.name, [], [{ row: 0, name: '', rawValue: '', reason: err.message }]);
        setMatchingResults([], []);
      }

      // Reset input para permitir re-subir el mismo archivo
      if (inputRef.current) inputRef.current.value = '';
    },
    [geoNames, setFileData, setMatchingResults]
  );

  const hasErrors = parseErrors.length > 0 || unmatchedData.length > 0;

  return (
    <div className="excel-uploader">
      <label className="upload-btn" htmlFor="excel-input">
        📂 Cargar Excel
      </label>
      <input
        ref={inputRef}
        id="excel-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {fileName && (
        <div className="upload-status">
          <span className="file-name">{fileName}</span>
          {isDataReady && <span className="status-ok">✓ Datos cargados</span>}
          <button className="btn-clear" onClick={resetAll} title="Limpiar datos">
            ✕
          </button>
        </div>
      )}

      {hasErrors && (
        <div className="upload-errors">
          <strong>⚠ Errores encontrados — corregir Excel y volver a subir:</strong>
          {parseErrors.map((err, i) => (
            <div key={`p-${i}`} className="error-item">
              Fila {err.row}: {err.reason}
              {err.name && <> ({err.name})</>}
            </div>
          ))}
          {unmatchedData.map((err, i) => (
            <div key={`u-${i}`} className="error-item">
              "{err.name}" (fila {err.row}): {err.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
