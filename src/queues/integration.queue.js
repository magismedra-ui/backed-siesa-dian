const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const siesaAdapter = require("../services/siesa-adapter.service");
const dianAdapter = require("../services/dian-adapter.service");
const DocumentoStaging = require("../database/models/DocumentoStaging");
const Ejecucion = require("../database/models/Ejecucion");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  retryStrategy: function (times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true, // No conectar inmediatamente al instanciar
});

// Manejo de errores de conexión silenciosos para no tumbar el server en dev
connection.on("error", (err) => {
  console.warn(
    "Redis connection failed (Queue system will be unavailable):",
    err.message
  );
});

let integrationQueue;
let worker;

try {
  integrationQueue = new Queue("integration-process", { connection });

  worker = new Worker(
    "integration-process",
    async (job) => {
      // ... (resto del código del worker se mantiene igual, solo ajustamos el wrapper)
      const { id_ejecucion, fechaInicio, fechaFin } = job.data;

      try {
        console.log(`Procesando ejecución #${id_ejecucion}...`);

        // Ejecución en paralelo para optimizar tiempo
        const [siesaResults, dianResults] = await Promise.allSettled([
          siesaAdapter.getCompras(fechaInicio, fechaFin),
          dianAdapter.getDocumentosElectronicos(fechaInicio, fechaFin),
        ]);

        let siesaData = [];
        let dianData = [];

        if (siesaResults.status === "fulfilled") siesaData = siesaResults.value;
        else console.error("Fallo SIESA:", siesaResults.reason);

        if (dianResults.status === "fulfilled") dianData = dianResults.value;
        else console.error("Fallo DIAN:", dianResults.reason);

        // Preparar bulk insert
        const bulkSiesa = siesaData.map((item) => ({
          num_factura: item.idDocumento,
          nit_proveedor: item.nitProveedor,
          fecha_emision: item.fechaEmision,
          valor_total: item.valorTotal,
          impuestos: item.iva,
          fuente: "SIESA",
          payload_original: item,
          ejecucion_id: id_ejecucion,
        }));

        const bulkDian = dianData.map((item) => ({
          num_factura: item.idDocumento,
          nit_proveedor: item.nitProveedor,
          fecha_emision: item.fechaEmision,
          valor_total: item.valorTotal,
          impuestos: item.iva,
          fuente: "DIAN",
          payload_original: item,
          ejecucion_id: id_ejecucion,
        }));

        const allData = [...bulkSiesa, ...bulkDian];

        if (allData.length > 0) {
          await DocumentoStaging.bulkCreate(allData);
        }

        const finalStatus =
          siesaResults.status === "rejected" ||
          dianResults.status === "rejected"
            ? "FALLA" // O 'PARCIAL' si tuviéramos ese estado
            : "EXITO"; // 'EXITO' no está en el ENUM del modelo, es 'FINALIZADO'

        await Ejecucion.update(
          {
            estado: finalStatus === "FALLA" ? "FALLIDO" : "FINALIZADO",
            fecha_fin: new Date(),
            docs_procesados: allData.length,
          },
          { where: { id: id_ejecucion } }
        );

        console.log(
          `Ejecución #${id_ejecucion} finalizada. Estado: ${finalStatus}`
        );
      } catch (error) {
        console.error(`Error fatal en ejecución #${id_ejecucion}:`, error);

        await Ejecucion.update(
          { estado: "FALLIDO", fecha_fin: new Date() },
          { where: { id: id_ejecucion } }
        );

        throw error;
      }
    },
    { connection }
  );
} catch (error) {
  console.error("Failed to initialize BullMQ:", error);
}

module.exports = { integrationQueue };
