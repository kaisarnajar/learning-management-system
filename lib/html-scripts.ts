export const PROCESS_IMAGE_SCRIPT = `
  async function processImages() {
    const imgs = document.querySelectorAll('img.process-white-bg');
    for (const img of Array.from(imgs)) {
      if (img instanceof HTMLImageElement) {
        if (!img.complete || img.naturalWidth === 0) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 400;
          canvas.height = img.naturalHeight || img.height || 200;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if (r > 240 && g > 240 && b > 240) {
              data[i + 3] = 0; 
            }
          }
          ctx.putImageData(imageData, 0, 0);
          img.src = canvas.toDataURL('image/png');
        } catch (e) {
          console.error('Image processing failed:', e);
        }
      }
    }
    window.__imagesProcessed = true;
  }
  processImages();
`;
