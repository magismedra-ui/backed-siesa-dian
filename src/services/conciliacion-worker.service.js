const { Worker } = require('bullmq');
const { redisConnection } = require('../config/queue');
const { procesarConciliacion, obtenerParametros, parseRetryTime } = require('./conciliacion.service');

const setupConciliacionWorker = () => {
	console.log('Inicializando Worker de Conciliación...');

	const worker = new Worker(
		'conciliacion-process',
		async (job) => {
			const { ejecucionId } = job.data;
			console.log(
				`[Worker Conciliación] Procesando Job ${job.id}${ejecucionId ? ` para ejecución ${ejecucionId}` : ''}`
			);

			try {
				const resultado = await procesarConciliacion(ejecucionId);

				console.log(
					`[Worker Conciliación] Job ${job.id} completado exitosamente`
				);
				return resultado;
			} catch (error) {
				console.error(`[Worker Conciliación] Error en Job ${job.id}:`, error);
				throw error;
			}
		},
		{
			connection: redisConnection,
			concurrency: 1, // Procesar un job a la vez para evitar conflictos
			limiter: {
				max: 1,
				duration: 1000, // Máximo 1 job por segundo
			},
		}
	);

	// Configurar reintentos dinámicos basados en parámetros
	worker.on('failed', async (job, err) => {
		console.error(
			`[Worker Conciliación] Job ${job?.id} falló: ${err.message}`
		);

		// Si el job tiene más reintentos disponibles, calcular backoff exponencial
		if (job && job.attemptsMade < job.opts.attempts) {
			const { VlrReintentos } = await obtenerParametros();
			const backoffDelay = Math.min(
				Math.pow(2, job.attemptsMade) * 30000, // Backoff exponencial base: 30s, 60s, 120s, etc.
				VlrReintentos || 300000 // Máximo según parámetro (default 5 minutos)
			);

			console.log(
				`[Worker Conciliación] Reintentando job ${job.id} en ${backoffDelay}ms (intento ${job.attemptsMade + 1}/${job.opts.attempts})`
			);
		}
	});

	worker.on('completed', (job) => {
		console.log(`[Worker Conciliación] Job ${job.id} completado exitosamente`);
	});

	worker.on('error', (err) => {
		console.error('[Worker Conciliación] Error en worker:', err);
	});

	return worker;
};

module.exports = { setupConciliacionWorker };

