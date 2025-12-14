const { Worker } = require("bullmq");
const { redisConnection } = require("../config/queue");
const ExcelJS = require("exceljs");
const fs = require("fs");
const Ejecucion = require("../database/models/Ejecucion");
const DocumentoStaging = require("../database/models/DocumentoStaging");

// Helper robusto para parsear fechas (acepta DD-MM-YYYY y YYYY-MM-DD)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  let parsedDate = new Date(dateStr);

  // Si new Date() falla o es inválida, intentar parseo manual para formato DD-MM-YYYY
  if (
    (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 1900) &&
    typeof dateStr === "string"
  ) {
    // Intentar separar por - o /
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // Asumir DD-MM-YYYY si el año está al final
      if (parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-based
        const year = parseInt(parts[2], 10);
        parsedDate = new Date(year, month, day);
      }
    }
  }

  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const setupWorker = () => {
  console.log("Inicializando Worker de Excel...");
  const worker = new Worker(
    "excel-processing",
    async (job) => {
      const { filePath, ejecucionId, usuarioId } = job.data;
      console.log(`Procesando Job ${job.id} para ejecución ${ejecucionId}`);

      try {
        await Ejecucion.update(
          { estado: "EN_PROCESO" },
          { where: { id: ejecucionId } }
        );

        const errores = [];
        let processedCount = 0;
        let batch = [];
        const BATCH_SIZE = 1000;

        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
          filePath,
          {
            entries: "emit",
            sharedStrings: "cache",
            hyperlinks: "ignore",
            styles: "ignore",
          }
        );

        let headers = null;
        const COLUMNAS = {
          nit: ["nit emisor", "nit", "nit_proveedor"],
          cufe: ["cufe/cude", "cufe", "cude", "num_factura"],
          folio: ["folio", "folio factura"],
          fecha: ["fecha emisión", "fecha emision", "fecha", "fecha_emision"],
          total: ["total", "valor_total"],
          iva: ["iva", "impuestos"],
        };

        for await (const worksheetReader of workbookReader) {
          for await (const row of worksheetReader) {
            if (row.number === 1) {
              headers = row.values
                .slice(1)
                .map((h) => (h ? h.toString().trim() : ""));
              continue;
            }

            if (!headers) continue;

            const rowValues = row.values.slice(1);
            const rowData = {};
            headers.forEach((h, i) => (rowData[h] = rowValues[i]));

            try {
              const getValue = (keys) => {
                for (const key of keys) {
                  const found = headers.find(
                    (h) => h && h.toLowerCase().includes(key)
                  );
                  if (found && rowData[found] !== undefined)
                    return rowData[found];
                }
                return null;
              };

              const fechaRaw = getValue(COLUMNAS.fecha);
              const fechaEmision = parseDate(fechaRaw);

              // VALIDACIÓN PRE-BATCH
              if (!fechaEmision) {
                throw new Error(
                  `Fecha inválida o vacía: ${fechaRaw} (Esperado YYYY-MM-DD o DD-MM-YYYY)`
                );
              }

              let numFactura = getValue(COLUMNAS.folio)?.toString();
              if (!numFactura) numFactura = getValue(COLUMNAS.cufe)?.toString();

              const documento = {
                ejecucion_id: ejecucionId,
                fuente: "DIAN",
                nit_proveedor: getValue(COLUMNAS.nit)?.toString(),
                num_factura: numFactura,
                fecha_emision: fechaEmision,
                valor_total: parseFloat(getValue(COLUMNAS.total) || 0),
                impuestos: parseFloat(getValue(COLUMNAS.iva) || 0),
                payload_original: rowData,
              };

              if (!documento.nit_proveedor) throw new Error("Falta NIT");
              if (!documento.num_factura)
                throw new Error("Falta Número de Factura/CUFE");

              batch.push(documento);
              processedCount++;

              if (batch.length >= BATCH_SIZE) {
                try {
                  // ignoreDuplicates: true usa INSERT IGNORE en MySQL para saltar duplicados
                  await DocumentoStaging.bulkCreate(batch, {
                    ignoreDuplicates: true,
                  });
                } catch (batchError) {
                  console.error("Error insertando Batch:", batchError.message);
                  throw new Error(
                    `Error insertando lote de ${BATCH_SIZE} registros: ${batchError.message}`
                  );
                } finally {
                  batch = []; // SIEMPRE LIMPIAR BATCH DESPUES DE INTENTO
                }

                await Ejecucion.update(
                  { docs_procesados: processedCount },
                  { where: { id: ejecucionId } }
                );
              }
            } catch (rowError) {
              errores.push({
                fila: row.number,
                error: rowError.message,
                data: rowData,
              });
            }
          }
        }

        if (batch.length > 0) {
          try {
            await DocumentoStaging.bulkCreate(batch, {
              ignoreDuplicates: true,
            });
          } catch (e) {
            errores.push({
              fila: "BATCH_FINAL",
              error: e.message,
              data: "Remanentes",
            });
          }
        }

        await Ejecucion.update(
          {
            estado:
              errores.length > 0 ? "COMPLETADO_CON_ERRORES" : "COMPLETADO",
            fecha_fin: new Date(),
            docs_procesados: processedCount,
            errores: errores.length > 0 ? errores : null,
          },
          { where: { id: ejecucionId } }
        );
      } catch (error) {
        console.error("Error Worker:", error);
        await Ejecucion.update(
          {
            estado: "FALLIDO",
            fecha_fin: new Date(),
            errores: [{ error_general: error.message }],
          },
          { where: { id: ejecucionId } }
        );
        throw error;
      } finally {
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => console.log(`Job ${job.id} OK`));
  worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} FAIL: ${err.message}`)
  );
};

module.exports = { setupWorker };
