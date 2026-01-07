const cron = require('node-cron');
const { conciliacionQueue } = require('../config/queue');
const { obtenerParametros, parseRetryTime } = require('./conciliacion.service');

/**
 * Scheduler para ejecutar el proceso de conciliación de forma automática
 * Por defecto ejecuta cada hora (configurable mediante variable de entorno)
 */
const setupConciliacionScheduler = () => {
	// Verificar si el scheduler está habilitado antes de crearlo
	const schedulerEnabled =
		process.env.CONCILIACION_SCHEDULER_ENABLED === 'true';

	if (!schedulerEnabled) {
		console.log(
			'[Scheduler Conciliación] Scheduler deshabilitado (CONCILIACION_SCHEDULER_ENABLED != true)'
		);
		return null;
	}

	// Obtener cron expression desde variable de entorno o usar default (cada hora)
	// Formatos válidos: "0 * * * *" (cada hora), "0 */6 * * *" (cada 6 horas), etc.
	const cronExpression =
		process.env.CONCILIACION_CRON || '0 * * * *'; // Default: cada hora

	console.log(
		`[Scheduler Conciliación] Configurando scheduler con expresión: ${cronExpression}`
	);

	// Validar expresión cron
	if (!cron.validate(cronExpression)) {
		console.error(
			`[Scheduler Conciliación] Expresión cron inválida: ${cronExpression}. Desactivando scheduler.`
		);
		return null;
	}

	const task = cron.schedule(
		cronExpression,
		async () => {
			try {
				console.log(
					'[Scheduler Conciliación] Ejecutando proceso de conciliación programado...'
				);

				// Obtener parámetros para configurar reintentos
				const { VlrReintentos } = await obtenerParametros();
				const maxRetries = Math.max(
					1,
					Math.ceil(VlrReintentos / 30000)
				);

				// Agregar job a la cola
				const job = await conciliacionQueue.add(
					'scheduled-conciliacion',
					{
						ejecucionId: null, // Procesar todos los documentos pendientes
						timestamp: new Date().toISOString(),
						triggeredBy: 'scheduler',
					},
					{
						attempts: maxRetries,
						backoff: {
							type: 'exponential',
							delay: 30000,
						},
						removeOnComplete: {
							age: 3600,
							count: 100,
						},
						removeOnFail: {
							age: 24 * 3600,
						},
					}
				);

				console.log(
					`[Scheduler Conciliación] Job ${job.id} agregado a la cola`
				);
			} catch (error) {
				console.error(
					'[Scheduler Conciliación] Error al programar job:',
					error
				);
			}
		},
		{
			scheduled: true, // Iniciar automáticamente ya que está habilitado
			timezone: 'America/Bogota', // Configurar timezone para Colombia
		}
	);

	console.log('[Scheduler Conciliación] Scheduler iniciado y activo');
	return task;
};

module.exports = { setupConciliacionScheduler };

