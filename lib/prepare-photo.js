// Optimize seller uploads in the browser before sending them to the private store.
export async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose JPG, PNG or WebP photos.');
  if (file.size > 20000000) throw new Error('Please choose photos smaller than 20 MB each.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare your photos. Try another browser.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob;
    for (const quality of [0.88, 0.76, 0.64, 0.5]) {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 350000) break;
    }
    if (!blob || blob.size > 350000) throw new Error('This photo is still too large. Try a closer crop of the slab.');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {type:'image/jpeg'});
  } finally { bitmap.close(); }
}
