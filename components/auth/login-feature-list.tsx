import { MailCheck, ShieldCheck, Sparkles } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

const FEATURES = [
    {
        title: 'Magic links only',
        description: 'Verify once with secure invites and skip passwords entirely.',
        icon: MailCheck,
    },
    {
        title: 'Session aware proxy',
        description: 'Our guardrails keep you on /login until your invite is confirmed.',
        icon: ShieldCheck,
    },
    {
        title: 'Friend-friendly rollout',
        description: 'New members can self-serve access without waiting for manual approval.',
        icon: Sparkles,
    },
]

export function LoginFeatureList() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
                <Card key={feature.title} className="border-none bg-white/70 shadow-lg shadow-black/5">
                    <CardContent className="flex flex-col gap-3 p-5">
                        <div className="inline-flex items-center gap-3 text-sm font-semibold">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <feature.icon className="h-5 w-5" />
                            </span>
                            {feature.title}
                        </div>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

