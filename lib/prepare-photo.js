// Optimize seller uploads in the browser before sending them to the private store.
function decodeHeic(file) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./heic-worker.js', import.meta.url));
    const finish = (error, bitmap) => {
      clearTimeout(timer);
      worker.terminate();
      if (error) reject(error); else resolve(bitmap);
    };
    const timer = setTimeout(() => finish(new Error('Photo conversion timed out')), 90000);
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.bitmap);
    worker.onerror = () => finish(new Error('Photo conversion failed'));
    worker.postMessage(file);
  });
}

export async function preparePhoto(file) {
  const heic = /^image\/hei[cf](?:-sequence)?$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  if (!heic && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose JPG, PNG, WebP or iPhone HEIC photos.');
  if (file.size > 20000000) throw new Error('Please choose photos smaller than 20 MB each.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (!heic) throw new Error('This photo could not be opened. Try another photo.');
    try {
      bitmap = await decodeHeic(file);
    } catch {
      throw new Error('This iPhone photo could not be converted. Try taking a new photo or choosing a JPG.');
    }
  }
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
