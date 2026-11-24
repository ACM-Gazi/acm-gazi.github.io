// Crops and shrinks a photo in the browser before it is uploaded.

export async function cropToBlob(file, rectFor) {
  const bmp = await createImageBitmap(file);
  const r = rectFor(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = r.dw;
  canvas.height = r.dh;
  canvas.getContext('2d').drawImage(bmp, r.sx, r.sy, r.sw, r.sh, 0, 0, r.dw, r.dh);
  bmp.close?.();
  const toBlob = (type) => new Promise((res) => canvas.toBlob(res, type, 0.85));
  const webp = await toBlob('image/webp');
  const blob = webp?.type === 'image/webp' ? webp : await toBlob('image/jpeg'); // Safari cannot encode WEBP
  if (!blob) throw new Error('encode_failed');
  return blob;
}
