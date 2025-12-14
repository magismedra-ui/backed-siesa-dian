const express = require("express");
const router = express.Router();
const siesaController = require("../controllers/siesa.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Rutas protegidas con token (opcional, según requerimiento)
router.get("/facturas", verifyToken, siesaController.getFacturas);

module.exports = router;
