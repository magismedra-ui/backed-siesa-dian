const { integrationQueue } = require("../queues/integration.queue");
const Ejecucion = require("../database/models/Ejecucion");

const triggerIntegration = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ error: "fechaInicio and fechaFin are required" });
    }

    const log = await Ejecucion.create({
      fecha_inicio: new Date(),
      estado: "PENDIENTE",
      usuario_id: req.user?.id || 1, // Fallback to 1 if no user id
    });

    if (integrationQueue) {
      await integrationQueue.add("sync-docs", {
        id_ejecucion: log.id,
        fechaInicio,
        fechaFin,
      });

      res.status(202).json({
        message: "Integration process started successfully",
        executionId: log.id,
      });
    } else {
      // Fallback si Redis no está disponible (solo para propósitos de debug/dev sin colas)
      console.warn("Queue system unavailable. Saving log but not processing.");
      res.status(503).json({
        message:
          "Integration recorded but processing queue is unavailable (Redis down).",
        executionId: log.id,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { triggerIntegration };
