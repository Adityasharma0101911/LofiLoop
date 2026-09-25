import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LofiLoop',
    short_name: 'LofiLoop',
    description: 'Make lofi beats in your browser.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f0e16',
    theme_color: '#0f0e16',
    categories: ['music', 'entertainment', 'productivity'],
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
