const express = require("express");
const router = express.Router();
const documentoStagingController = require("../controllers/documentoStaging.controller");

// Rutas CRUD para documentos staging
router.post("/", documentoStagingController.createDocumento);
router.get("/", documentoStagingController.getDocumentos);
router.get("/:id", documentoStagingController.getDocumentoById);
router.put("/:id", documentoStagingController.updateDocumento);
router.delete("/:id", documentoStagingController.deleteDocumento);

module.exports = router;
