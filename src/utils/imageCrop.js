/**
 * Crops an image to show only the top-middle portion (full width, top 50% height)
 * @param {string} imageUrl - URL of the image to crop
 * @returns {Promise<string>} - Promise resolving to data URL of cropped image
 */
export async function cropImageToTopRight(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas to full width and half the height
      canvas.width = img.width;
      canvas.height = img.height / 2;
      
      // Draw the top half of the image (full width)
      // source: (startX, startY, width, height)
      // destination: (0, 0, canvas.width, canvas.height)
      ctx.drawImage(
        img,
        0,             // startX - start from left
        0,             // startY - start from top
        img.width,     // width - draw full width
        img.height / 2, // height - draw top half
        0, 0, canvas.width, canvas.height
      );
      
      resolve(canvas.toDataURL());
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}
