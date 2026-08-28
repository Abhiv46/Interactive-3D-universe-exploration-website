import { useCallback, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useI18n } from '@/i18n/index';

interface OGImageOptions {
  title?: string;
  subtitle?: string;
  bodyName?: string;
  includeWatermark?: boolean;
}

/**
 * Generates an Open Graph image from the current Three.js canvas
 * with optional overlay text
 */
export function useOGImageGenerator() {
  const { gl } = useThree();
  const { t } = useI18n();
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generateOGImage = useCallback(async (
    options: OGImageOptions = {}
  ): Promise<Blob | null> => {
    if (!gl || isGenerating) return null;

    setIsGenerating(true);

    try {
      // Get the Three.js canvas
      const threeCanvas = gl.domElement;

      // Create a new canvas for the OG image (1200x630)
      const ogWidth = 1200;
      const ogHeight = 630;
      const canvas = document.createElement('canvas');
      canvas.width = ogWidth;
      canvas.height = ogHeight;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) throw new Error('Failed to get 2D context');

      // Draw the Three.js canvas scaled to fit
      const aspectRatio = threeCanvas.width / threeCanvas.height;
      let drawWidth = ogWidth;
      let drawHeight = ogWidth / aspectRatio;

      if (drawHeight > ogHeight) {
        drawHeight = ogHeight;
        drawWidth = ogHeight * aspectRatio;
      }

      const x = (ogWidth - drawWidth) / 2;
      const y = (ogHeight - drawHeight) / 2;

      // Fill background with dark color
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, ogWidth, ogHeight);

      // Draw the 3D view
      ctx.drawImage(threeCanvas, x, y, drawWidth, drawHeight);

      // Add gradient overlay at bottom for text readability
      const gradient = ctx.createLinearGradient(0, ogHeight * 0.6, 0, ogHeight);
      gradient.addColorStop(0, 'rgba(15, 15, 26, 0)');
      gradient.addColorStop(1, 'rgba(15, 15, 26, 0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, ogHeight * 0.6, ogWidth, ogHeight * 0.4);

      // Add title
      const title = options.title || t('share.ogTitle');
      ctx.font = 'bold 48px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(title, ogWidth / 2, ogHeight - 140);

      // Add subtitle with body name
      if (options.bodyName) {
        const subtitle = t('share.ogDescription', { body: options.bodyName });
        ctx.font = '24px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        // Wrap text if too long
        const maxWidth = ogWidth - 80;
        const words = subtitle.split(' ');
        let line = '';
        const lines: string[] = [];

        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            lines.push(line.trim());
            line = word + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());

        const lineHeight = 32;
        const startY = ogHeight - 80 - (lines.length - 1) * lineHeight;
        lines.forEach((lineText, i) => {
          ctx.fillText(lineText, ogWidth / 2, startY + i * lineHeight);
        });
      } else if (options.subtitle) {
        ctx.font = '24px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(options.subtitle, ogWidth / 2, ogHeight - 80);
      }

      // Add watermark/logo
      if (options.includeWatermark !== false) {
        ctx.font = '20px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'left';
        ctx.fillText('Universe Explorer', 40, ogHeight - 30);

        ctx.textAlign = 'right';
        ctx.fillText(new Date().getFullYear().toString(), ogWidth - 40, ogHeight - 30);
      }

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 0.9);
      });
    } catch (error) {
      console.error('Failed to generate OG image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [gl, isGenerating, t]);

  const generateDataURL = useCallback(async (
    options: OGImageOptions = {}
  ): Promise<string | null> => {
    const blob = await generateOGImage(options);
    if (!blob) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }, [generateOGImage]);

  const downloadOGImage = useCallback(async (
    options: OGImageOptions = {},
    filename = 'universe-explorer-og.png'
  ) => {
    const blob = await generateOGImage(options);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateOGImage]);

  return {
    generateOGImage,
    generateDataURL,
    downloadOGImage,
    isGenerating,
  };
}

/**
 * Hook to dynamically update Open Graph meta tags
 * for social media previews when sharing specific views
 */
export function useOGMetaTags() {
  const updateOGMetaTags = useCallback((
    title: string,
    description: string,
    imageUrl: string,
    url?: string
  ) => {
    // Update Open Graph tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: imageUrl },
      { property: 'og:url', content: url || window.location.href },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
    ];

    ogTags.forEach(({ property, name, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`) ||
                document.querySelector(`meta[name="${name}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      }
    });

    // Update document title
    document.title = title;
  }, []);

  const resetOGMetaTags = useCallback(() => {
    // Reset to default values
    const defaults = {
      'og:title': 'Universe Explorer - Interactive 3D Solar System & Cosmos',
      'og:description': 'Explore the cosmos in 3D. Visit planets, moons, and deep space objects. Real-time positions, NASA APOD, guided tours, and more.',
      'og:image': 'https://universe-explorer.vercel.app/og-image.png',
      'og:url': 'https://universe-explorer.vercel.app/',
      'twitter:title': 'Universe Explorer - Interactive 3D Solar System & Cosmos',
      'twitter:description': 'Explore the cosmos in 3D. Visit planets, moons, and deep space objects. Real-time positions, NASA APOD, guided tours, and more.',
      'twitter:image': 'https://universe-explorer.vercel.app/og-image.png',
    };

    Object.entries(defaults).forEach(([key, content]) => {
      const isProperty = key.startsWith('og:');
      const selector = isProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
      const tag = document.querySelector(selector);
      if (tag) {
        tag.setAttribute('content', content);
      }
    });

    document.title = defaults['og:title'];
  }, []);

  return { updateOGMetaTags, resetOGMetaTags };
}