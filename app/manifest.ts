import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'OuterCircl',
        short_name: 'OuterCircl',
        description:
            'Discover local activities, connect with trusted communities, and plan your next meetup with OuterCircl.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#eb1242',
        icons: [
            {
                src: '/favicon.ico',
                sizes: '48x48 32x32 16x16',
                type: 'image/x-icon',
            },
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
        ],
    }
}
