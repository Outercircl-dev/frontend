This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Activity Participation UI

- The feed and detail views proxy the backend via `/rpc/v1/activities` (list) and `/rpc/v1/activities/[activityId]` (detail). These routes forward the Supabase session token so viewers see their participation state and hidden meeting points.
- Joining/cancelling happens through `/rpc/v1/activities/[activityId]/participants` (POST/DELETE). Host approvals live under `/rpc/v1/activities/[activityId]/participants/[participantId]`.
- Hosts can review and moderate their roster at `/host/activities/[activityId]/participants`, while members can manage their own RSVP on `/activities/[activityId]`.

## Activity Hosting (FR4)

- Host tools live under `/activities` (my activities overview), `/activities/new` (create), and `/activities/[activityId]/edit` (edit).
- Premium group management is under `/activities/groups` and proxies to `/rpc/v1/activities/groups`.
- Recurring schedules are captured via the activity form and sent to `/rpc/v1/activities` as `recurrence`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
