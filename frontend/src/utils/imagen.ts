/** Resuelve la foto de un tipo de habitación.
 *  - Si el tipo tiene foto subida (/api/uploads/...) se usa tal cual
 *    (el proxy de Vite la redirige al backend en desarrollo).
 *  - Si es una URL externa se usa directa.
 *  - Si no hay foto, se usa la imagen de respaldo. */
export function fotoTipo(
  tipo: { imagen_url?: string | null } | null | undefined,
  fallback: string
): string {
  const url = tipo?.imagen_url?.trim();
  if (!url) return fallback;
  return url;
}
