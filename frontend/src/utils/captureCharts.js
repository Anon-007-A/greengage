import html2canvas from 'html2canvas';
import { logger } from '@/lib/logger';

/**
 * Capture chart DOM nodes as images.
 * selectors: array of { id: 'chart-id', name: 'friendlyName' }
 * Returns: { [name]: dataUrl }
 */
export async function captureChartImages(selectors = []) {
  const result = {};
  for (const s of selectors) {
    try {
      const node = document.getElementById(s.id);
      if (!node) continue;
      // use higher scale for better print quality
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, logging: false });
      result[s.name] = canvas.toDataURL('image/png');
    } catch (e) {
      // ignore capture errors for optional charts
      logger.error('captureChartImages error', s.id, e);
    }
  }
  return result;
}

export default captureChartImages;
