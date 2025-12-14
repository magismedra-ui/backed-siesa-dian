const siesaAdapterService = require("../services/siesa-adapter.service");

/**
 * Obtiene las facturas de servicios o proveedores desde SIESA
 * @route GET /api/v1/siesa/facturas
 */
const getFacturas = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, consulta } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Parámetros requeridos faltantes",
        message: "Debe proporcionar 'fechaInicio' y 'fechaFin' (YYYY-MM-DD)",
      });
    }

    // Valor por defecto si no se envía consulta
    const nombreConsulta = consulta || "listar_facturas_servicios";

    const data = await siesaAdapterService.getFacturas(
      fechaInicio,
      fechaFin,
      nombreConsulta
    );

    res.status(200).json({
      success: true,
      count: data.length,
      consulta: nombreConsulta,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacturas,
};
