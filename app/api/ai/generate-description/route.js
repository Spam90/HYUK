import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    // Endpoint protegido: solo usuarios autenticados (admin)
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productName } = body;

    if (!productName || typeof productName !== 'string') {
      return Response.json({ error: 'El nombre del producto es requerido' }, { status: 400 });
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

    return Response.json({ success: true, description: text.trim() });
  } catch (error) {
    console.error('Error en generate-description API:', error);
    return Response.json(
      { error: 'Error al generar la descripción con IA.' },
      { status: 500 }
    );
  }
}