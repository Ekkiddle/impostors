import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Impostors',
        short_name: 'Impostors',
        description: 'An IRL among us style game where you complete tasks to win, but beware of the impostors among you!',
        start_url: '/',
        display: 'standalone', // This makes it download as an app, not a shortcut
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}
