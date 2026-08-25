// =============================================================
// /api/upload — subida de imágenes con service-role.
//
// Recibe FormData con el campo "file". Valida sesión del usuario,
// tipo (imagen) y tamaño (max 8MB), sube al bucket de Storage y
// devuelve la URL pública.
//
// Usa service-role para NO depender de las políticas RLS del
// bucket (que pueden estar rotas o ausentes).
// =============================================================
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: 'No autenticado' }, 401);

    const admin = createServiceClient();
    if (!admin) {
      return json(
        { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en el servidor' },
        503
      );
    }

    const formData = await req.formData().catch(() => null);
    const file = formData?.get('file');
    if (!file || typeof file === 'string') {
      return json({ ok: false, error: 'No se recibió ningún archivo' }, 400);
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return json({ ok: false, error: 'El archivo debe ser una imagen' }, 400);
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      return json({ ok: false, error: 'La imagen no debe superar los 8MB' }, 400);
    }

    // Generar nombre único. La cámara del celular suele devolver
    // blobs sin extensión -> derivarla del MIME type.
    const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extMap[file.type] || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const folder = formData?.get('folder') === 'banners' ? 'banners' : 'products';
    const filePath = `${user.id}/${folder}/${fileName}`;

    const { data: uploaded, error: uploadError } = await admin.storage
      .from(folder)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = admin.storage.from(folder).getPublicUrl(filePath);
    return json({ ok: true, url: publicUrl, path: uploaded?.path || filePath });
  } catch (err) {
    console.error('[upload]', err?.message);
    return json({ ok: false, error: err?.message || 'Error subiendo la imagen' }, 500);
  }
}
