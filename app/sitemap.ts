// Copyright (c) 2026 Outer Circle. All rights reserved.

import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://outercircle.com'

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = ['/', '/login']

    return routes.map((route) => ({
        url: `${siteUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '/' ? 'weekly' : 'monthly',
        priority: route === '/' ? 1 : 0.8,
    }))
}
