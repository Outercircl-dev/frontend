// Copyright (c) 2026 Outer Circle. All rights reserved.

import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://outercircle.com'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}
