const createHttpClient = require('../utils/http-client');
const { parseXmlToJson } = require('../utils/xml-parser');

const siesaClient = createHttpClient(process.env.SIESA_WS_URL || 'http://localhost:8080/siesa');

class SiesaAdapterService {
  async getCompras(fechaInicio, fechaFin) {
    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sies="http://siesa.com/ws">
         <soapenv:Header/>
         <soapenv:Body>
            <sies:ConsultarCompras>
               <fechaInicio>${fechaInicio}</fechaInicio>
               <fechaFin>${fechaFin}</fechaFin>
            </sies:ConsultarCompras>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    try {
      const { data: xmlResponse } = await siesaClient.post('', soapBody);
      const rawJson = await parseXmlToJson(xmlResponse);
      
      // Ajustar según estructura real cuando se tenga
      const result = rawJson['soap:Envelope']?.['soap:Body']?.['ConsultarComprasResponse']?.['Resultado'];
      
      const listaCompras = result ? (Array.isArray(result) ? result : [result]) : [];
      
      return listaCompras.map(this.normalizeData).filter(Boolean);
    } catch (error) {
      console.error('Error en Adaptador SIESA:', error.message);
      // Retornar array vacío o re-lanzar según política de negocio
      // Aquí re-lanzamos para que el worker sepa que falló
      throw error;
    }
  }

  normalizeData(rawItem) {
    if (!rawItem) return null;
    
    return {
      idDocumento: rawItem.NumeroDocumento,
      nitProveedor: rawItem.Nit,
      fechaEmision: rawItem.Fecha,
      valorTotal: parseFloat(rawItem.Total),
      iva: parseFloat(rawItem.Impuestos),
      origen: 'SIESA'
    };
  }
}

module.exports = new SiesaAdapterService();

