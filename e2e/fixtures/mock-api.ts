import type { Page, Route, Request } from '@playwright/test'
import type { Activity } from '@/lib/types/activity'
import type { ActivityMessage } from '@/lib/types/message'
import type { FeedbackFormResponse, FeedbackSubmissionSummary } from '@/lib/types/feedback'
import {
  baseAuthState,
  baseAuthUser,
  buildActivity,
  buildActivitiesResponse,
  buildFeedbackForm,
  buildFeedbackSubmission,
  buildMessage,
  buildMessagesResponse,
  buildParticipants,
  withViewerStatus,
} from './mock-data'

type BillingConfig = {
  checkoutUrl?: string
  statusTier?: string
}

export type MockApiOptions = {
  authState?: typeof baseAuthState
  activities?: ReturnType<typeof buildActivitiesResponse>
  activity?: Activity
  joinActivity?: Activity
  cancelActivity?: Activity
  messages?: ReturnType<typeof buildMessagesResponse>
  messagePostResponse?: ActivityMessage
  pinResponse?: ActivityMessage
  feedbackForm?: FeedbackFormResponse
  feedbackSubmission?: FeedbackSubmissionSummary
  participants?: ReturnType<typeof buildParticipants>
  billing?: BillingConfig
}

const jsonResponse = (route: Route, body: unknown, status = 200) => {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

const notFound = (route: Route) => jsonResponse(route, { error: 'Not mocked' }, 404)

const matchActivityId = (path: string) => {
  const match = path.match(/^\/rpc\/v1\/activities\/([^/]+)/)
  return match?.[1]
}

export async function setupMockApi(page: Page, options: MockApiOptions = {}) {
  const defaultActivity = options.activity ?? buildActivity()
  const activitiesResponse =
    options.activities ??
    buildActivitiesResponse([
      defaultActivity,
      buildActivity({
        id: 'activity-2',
        title: 'Coffee Walk',
        category: 'social',
        interests: ['coffee', 'walking'],
        hostId: 'host-2',
        location: { address: 'Grand Canal Dock', latitude: 53.34, longitude: -6.24 },
        startTime: '10:00:00',
        endTime: '11:30:00',
      }),
    ])
  const messageResponse = options.messages ?? buildMessagesResponse()
  const feedbackForm = options.feedbackForm ?? buildFeedbackForm()
  let participants = options.participants ?? buildParticipants()

  const authState = options.authState ?? baseAuthState
  const checkoutUrl = options.billing?.checkoutUrl ?? '/pricing/success'
  const statusTier = options.billing?.statusTier ?? 'premium'

  await page.route('**/rpc/v1/**', async (route: Route, request: Request) => {
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()

    if (path === '/rpc/v1/auth/me' && method === 'GET') {
      return jsonResponse(route, authState)
    }

    if (path === '/rpc/v1/activities' && method === 'GET') {
      return jsonResponse(route, activitiesResponse)
    }

    if (path === '/rpc/v1/activities' && method === 'POST') {
      const payload = await request.postDataJSON().catch(() => ({}))
      const created = buildActivity({
        id: 'activity-new',
        title: payload?.title ?? 'New activity',
        category: payload?.category ?? 'social',
        interests: payload?.interests ?? ['running'],
        location: payload?.location ?? defaultActivity.location,
        activityDate: payload?.activityDate ?? defaultActivity.activityDate,
        startTime: payload?.startTime ?? defaultActivity.startTime,
        endTime: payload?.endTime ?? defaultActivity.endTime,
        maxParticipants: payload?.maxParticipants ?? defaultActivity.maxParticipants,
      })
      return jsonResponse(route, created)
    }

    if (path === '/rpc/v1/activities/groups' && method === 'GET') {
      return jsonResponse(route, [
        { id: 'group-1', name: 'Morning Crew', is_public: true },
        { id: 'group-2', name: 'Weekend Walkers', is_public: false },
      ])
    }

    if (path === '/rpc/v1/billing/checkout' && method === 'POST') {
      return jsonResponse(route, { url: checkoutUrl })
    }

    if (path === '/rpc/v1/billing/status' && method === 'GET') {
      return jsonResponse(route, { tier: statusTier })
    }

    const activityId = matchActivityId(path)

    if (activityId && path === `/rpc/v1/activities/${activityId}` && method === 'GET') {
      return jsonResponse(route, { ...defaultActivity, id: activityId })
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/participants` && method === 'GET') {
      return jsonResponse(route, { participants })
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/participants` && method === 'POST') {
      const next = options.joinActivity ?? withViewerStatus({ ...defaultActivity, id: activityId }, 'confirmed')
      return jsonResponse(route, { activity: next })
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/participants` && method === 'DELETE') {
      const next = options.cancelActivity ?? withViewerStatus({ ...defaultActivity, id: activityId }, 'not_joined')
      return jsonResponse(route, { activity: next })
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/participants/${participants[0]?.id}` && method === 'PATCH') {
      const payload = await request.postDataJSON().catch(() => ({}))
      participants = participants.map((item) =>
        item.id === participants[0]?.id
          ? {
              ...item,
              status: payload?.action === 'approve' ? 'confirmed' : 'cancelled',
            }
          : item,
      )
      return jsonResponse(route, { ok: true })
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/messages` && method === 'GET') {
      return jsonResponse(route, messageResponse)
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/messages` && method === 'POST') {
      const payload = await request.postDataJSON().catch(() => ({}))
      const newMessage = options.messagePostResponse ?? buildMessage({
        id: 'message-new',
        activityId,
        content: payload?.content ?? 'New message',
        messageType: payload?.messageType ?? 'user',
        isPinned: Boolean(payload?.isPinned),
        authorName: baseAuthUser.email.split('@')[0],
      })
      return jsonResponse(route, newMessage)
    }

    if (activityId && path.endsWith('/pin') && method === 'PATCH') {
      const payload = await request.postDataJSON().catch(() => ({}))
      const messageId = path.split('/').slice(-2, -1)[0]
      const pinnedMessage =
        options.pinResponse ??
        buildMessage({
          id: messageId,
          activityId,
          content: 'Pinned update',
          isPinned: Boolean(payload?.isPinned),
          messageType: 'announcement',
        })
      return jsonResponse(route, pinnedMessage)
    }

    if (activityId && path.endsWith('/report') && method === 'POST') {
      return jsonResponse(route, { ok: true })
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/feedback` && method === 'GET') {
      return jsonResponse(route, feedbackForm)
    }

    if (activityId && path === `/rpc/v1/activities/${activityId}/feedback` && method === 'POST') {
      const submission = options.feedbackSubmission ?? buildFeedbackSubmission()
      return jsonResponse(route, submission)
    }

    return notFound(route)
  })
}
