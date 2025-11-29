const { integrationQueue } = require('../queues/integration.queue');
const EjecucionesLog = require('../database/models/EjecucionesLog');

const triggerIntegration = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.body;
    
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'fechaInicio and fechaFin are required' });
    }

    const log = await EjecucionesLog.create({
      fecha_inicio: new Date(),
      estado: 'EN_PROCESO'
    });

    if (integrationQueue) {
      await integrationQueue.add('sync-docs', {
        id_ejecucion: log.id_ejecucion,
        fechaInicio,
        fechaFin
      });
  
      res.status(202).json({
        message: 'Integration process started successfully',
        executionId: log.id_ejecucion
      });
    } else {
      // Fallback si Redis no está disponible (solo para propósitos de debug/dev sin colas)
      console.warn('Queue system unavailable. Saving log but not processing.');
      res.status(503).json({
        message: 'Integration recorded but processing queue is unavailable (Redis down).',
        executionId: log.id_ejecucion
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { triggerIntegration };

