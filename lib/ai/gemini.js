// =============================================
// HYUK - SERVICIO DE INTEGRACIÓN CON GEMINI AI
// =============================================

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Genera descripciones de producto con IA usando Gemini 1.5 Flash
 * @param {string} productName - Nombre del producto para contextualizar la descripción
 * @returns {Promise<string>} - Descripción generada por IA
 */
export async function generateProductDescription(productName) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Actúa como un experto en marketing de comercio electrónico. 
Escribe una descripción de producto vendedora y persuasiva en español para el siguiente producto:

Producto: "${productName}"

Instrucciones:
- Escribe una descripción de 1-2 párrafos (máximo 150 palabras)
- Destaca los beneficios y características clave
- Usa un tono cercano y profesional
- Incluye un llamado a la acción implícito
- No inventes características específicas que no se puedan inferir del nombre
- Enfócate en lo que un cliente buscaría al leer la descripción
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error('Error generando descripción con IA:', error);
    throw error;
  }
}

/**
 * Escanea un menú/ imagen con IA y extrae categorías y productos
 * @param {string} imageBase64 - Imagen en base64
 * @returns {Promise<object>} - Datos estructurados extraídos
 */
export async function scanMenuImage(imageBase64) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Eres un asistente de IA especializado en extraer información estructurada de menús y catálogos físicos.
Tu tarea es analizar una imagen de menú o catálogo físico y extraer TODAS las categorías, productos y precios.
Responde ÚNICAMENTE con un objeto JSON válido siguiendo exactamente el esquema proporcionado.
Si un producto no tiene descripción visible, deja el campo "description" vacío.
Si no puedes identificar un precio, asume 0.00.
No inventes información que no esté en la imagen.

Esquema JSON:
{
  "categories": [
    {
      "name": "Nombre de la categoría",
      "products": [
        {
          "name": "Nombre del producto",
          "price": 10.50,
          "description": "Descripción extraída"
        }
      ]
    }
  ]
}

Si un producto no tiene categoría explícita, agrégalo a una categoría llamada "Otros".
`;

    const image = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ''),
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    const text = response.text();

    // Limpiar y parsear JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta de la IA');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    if (!parsedData.categories || !Array.isArray(parsedData.categories)) {
      throw new Error('Formato de respuesta inválido');
    }

    return parsedData;
  } catch (error) {
    console.error('Error escaneando menú con IA:', error);
    throw error;
  }
}