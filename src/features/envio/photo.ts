import type { UploadSignature } from '../../api/mock-types';
import { ApiError, request } from '../../lib/api';
import type { DraftPhoto } from './draft';

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const invalidFile = () => new ApiError('INVALID_FILE', 'Envie uma foto JPG da folha, com até 10 MB.', false, 422);

function toJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Deixa a foto pronta para o envio: JPG de até 10 MB. Um JPG que já cabe segue como está;
 * outros formatos (ou fotos grandes demais) são convertidos e comprimidos no navegador.
 */
export async function preparePhoto(file: File): Promise<DraftPhoto> {
  if (file.type === 'image/jpeg' && file.size <= MAX_PHOTO_BYTES) {
    return { name: file.name, blob: file };
  }
  if (!file.type.startsWith('image/')) {
    throw invalidFile();
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw invalidFile();
  }

  // Reduz o lado maior aos poucos até caber em 10 MB.
  for (const [maxSide, quality] of [[4000, 0.9], [3000, 0.85], [2400, 0.8], [1800, 0.75]] as const) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await toJpeg(canvas, quality);
    if (blob && blob.size <= MAX_PHOTO_BYTES) {
      return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', blob };
    }
  }

  throw invalidFile();
}

/** Envia a foto direto ao Cloudinary com a assinatura do backend e devolve o id do arquivo. */
export async function uploadPhoto(photo: DraftPhoto): Promise<string> {
  const signature = await request<UploadSignature>('POST', '/v1/uploads/sign');
  const form = new FormData();
  for (const [key, value] of Object.entries(signature.fields)) {
    form.append(key, value);
  }
  form.append('file', photo.blob, photo.name);

  let response: Response;
  try {
    response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Não foi possível conectar. Confira a sua internet e tente de novo.', true, 0);
  }
  if (!response.ok) {
    throw new ApiError('INVALID_FILE', 'Envie uma foto JPG da folha, com até 10 MB.', false, response.status);
  }
  return signature.assetId;
}
