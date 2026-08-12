import { GoogleGenerativeAI } from '@google/generative-ai';

// Prompt de sistema para el análisis de menús
const SYSTEM_PROMPT = `Eres un asistente de IA especializado en extraer información estructurada de menús y catálogos físicos.
Tu tarea es analizar una imagen de menú o catálogo físico y extraer TODAS las categorías, productos y precios con la mayor precisión posible.
Responde ÚNICAMENTE con un objeto JSON válido siguiendo exactamente el esquema proporcionado.
Si un producto no tiene descripción visible, deja el campo "description" vacío.
Si no puedes identificar un precio, asume 0.00.
No inventes información que no esté en la imagen.`;

const JSON_SCHEMA = `
{
  "categories": [
    {
      "name": "string - Nombre de la categoría",
      "products": [
        {
          "name": "string - Nombre del producto",
          "price": "number - Precio del producto (número decimal)",
          "description": "string - Descripción extraída de la imagen (puede estar vacía)"
        }
      ]
    }
  ]
}
`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return Response.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

    // Verificar API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY no está configurada');
      return Response.json(
        { error: 'La API de IA no está configurada. Contacta al administrador.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Preparar el prompt con la imagen
    const prompt = `${SYSTEM_PROMPT}
    
    Esquema JSON requerido:
    ${JSON_SCHEMA}
    
    Instrucciones adicionales:
    - Extrae todas las categorías visibles (ej: "Entradas", "Platos Principales", "Bebidas", etc.)
    - Extrae todos los productos con sus precios exactos
    - Preserva la descripción original si existe
    - Agrupa productos bajo su categoría correspondiente
    - Si un producto no tiene categoría explícita, ponlo en una categoría llamada "Otros"`;

    // Preparar la imagen para Gemini
    const image = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ''),
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, image]);
    const response = await result.response;
    let text = response.text();

    // Limpiar la respuesta: extraer solo el JSON
    // Gemini puede envolver el JSON en bloques de código markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsedData;

    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        console.error('Raw response:', text);
        return Response.json(
          { error: 'No se pudo procesar la respuesta de la IA. Intenta con otra imagen.' },
          { status: 500 }
        );
      }
    } else {
      return Response.json(
        { error: 'La IA no devolvió un formato válido. Intenta con otra imagen más clara.' },
        { status: 500 }
      );
    }

    // Validar estructura mínima
    if (!parsedData.categories || !Array.isArray(parsedData.categories)) {
      return Response.json(
        { error: 'Formato de respuesta inválido de la IA.' },
        { status: 500 }
      );
    }

    return Response.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Error en scan-menu API:', error);
    return Response.json(
      { error: 'Error al procesar la imagen. Verifica que sea clara y legible.' },
      { status: 500 }
    );
  }
}