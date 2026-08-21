import { GoogleGenerativeAI } from '@google/generative-ai';
import { hasAiFeatureAccess, aiUpgradeError } from '@/lib/ai-guard';

// Prompt para generar una paleta de colores y estilo a partir de una imagen
const SYSTEM_PROMPT = `Eres un diseñador experto de interfaces para catálogos digitales de comercio.
Analiza la imagen proporcionada y extrae una paleta de colores armónica y un estilo visual coherente
para personalizar un catálogo de productos.

Responde ÚNICAMENTE con un objeto JSON válido con exactamente este esquema:
{
  "primaryColor": "hex string",
  "secondaryColor": "hex string",
  "backgroundColor": "hex string",
  "cardBackgroundColor": "hex string",
  "textColor": "hex string",
  "accentColor": "hex string",
  "fontFamily": "font-sans | font-poppins | font-montserrat | font-playfair | font-outfit | font-space-grotesk",
  "borderRadius": "rounded-none | rounded-lg | rounded-xl | rounded-2xl | rounded-full"
}

Usa colores dominantes de la imagen para la paleta. Garantiza buen contraste y accesibilidad.
No inventes colores; derívalos de la imagen.`;

export async function POST(request) {
  try {
    // Endpoint protegido: solo usuarios autenticados (admin)
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // La IA es un beneficio Pro o del trial de 28 días (regla de negocio v2)
    if (!(await hasAiFeatureAccess(supabase, user.id))) {
      return aiUpgradeError();
    }

    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return Response.json({ error: 'No se proporcionó imagen' }, { status: 400 });
    }

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

    const image = {
      inlineData: {
        data: imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ''),
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([SYSTEM_PROMPT, image]);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: 'La IA no devolvió un formato válido. Intenta con otra imagen.' },
        { status: 500 }
      );
    }

    const theme = JSON.parse(jsonMatch[0]);
    return Response.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error en generate-theme API:', error);
    return Response.json(
      { error: 'Error al generar el diseño con IA. Verifica que la imagen sea clara.' },
      { status: 500 }
    );
  }
}