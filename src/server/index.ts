import { NextRequest, NextResponse } from 'next/server';

export interface StoredTicket {
  id: string;
  type: 'bug' | 'suggestion' | 'ticket' | 'newsletter';
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  subject?: string;
  message: string;
  userEmail?: string;
  userName?: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    dataUrl?: string;
    url?: string;
  }>;
  createdAt: string;
  environment?: {
    path?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
  };
}

export interface BroadcastRecord {
  id: string;
  appId?: string;
  subject: string;
  content: string;
  recipientCount: number;
  sentAt: string;
}

export interface EngageRequestUser {
  id?: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
}

export interface EngageEmailMessage {
  subject: string;
  htmlContent: string;
}

export interface EngageEmailContent {
  adminRecipientName?: string;
  renderReply?: (context: { ticketId: string; email: string; replyText: string }) => EngageEmailMessage;
  renderWelcome?: (context: { email: string; payload: unknown }) => EngageEmailMessage;
  renderAdminNotification?: (context: {
    type: string;
    category: string;
    userEmail: string;
    message: string;
    payload: unknown;
  }) => EngageEmailMessage;
  renderBroadcast?: (context: {
    subject: string;
    content: string;
    unsubscribeUrl: string;
  }) => EngageEmailMessage;
}

export interface EngageServerConfig {
  apiKey?: string;
  adminEmail?: string;
  senderEmail?: string;
  senderName?: string;
  /** Optional host-owned seed data for isolated memory-mode demos or tests. */
  initialTickets?: StoredTicket[];
  /** Optional host renderers for every email emitted by the reusable server handler. */
  emailContent?: EngageEmailContent;
  /** Resolve the authenticated host-app user for user-scoped and admin requests. */
  resolveRequestUser?: (request: NextRequest) => Promise<EngageRequestUser | null> | EngageRequestUser | null;
  db?: any;
  tables?: {
    tickets?: any;
    subscribers?: any;
    templates?: any;
    broadcasts?: any;
    suggestionVotes?: any;
  };
}

const globalBroadcastStore: BroadcastRecord[] = [];
const globalSuggestionVoteStore = new Set<string>(); // "suggestionId:userKey"

// Memory store fallback for standalone app without DB
const globalTicketStore: StoredTicket[] = [];

export function createEngageRouteHandler(config?: EngageServerConfig) {
  const db = config?.db;
  const tables = config?.tables;
  const ticketStore = config?.initialTickets ? [...config.initialTickets] : globalTicketStore;
  const emailContent = config?.emailContent;

  const getApiKey = () => config?.apiKey || process.env.ENGAGE_API_KEY || process.env.BREVO_API_KEY;
  const getAdminEmail = () =>
    config?.adminEmail ||
    process.env.ENGAGE_ADMIN_EMAIL ||
    process.env.ENGAGE_NOTIFICATION_EMAIL ||
    process.env.ENGAGE_RECIPIENT_EMAIL ||
    process.env.FEEDBACK_RECIPIENT_EMAIL ||
    'support@example.com';
  const getSenderEmail = () =>
    config?.senderEmail ||
    process.env.ENGAGE_FROM_EMAIL ||
    process.env.ENGAGE_SENDER_EMAIL ||
    process.env.FEEDBACK_SENDER_EMAIL ||
    getAdminEmail();
  const getSenderName = () =>
    config?.senderName ||
    process.env.ENGAGE_FROM_NAME ||
    process.env.ENGAGE_SENDER_NAME ||
    process.env.FEEDBACK_SENDER_NAME ||
    'Support Team';
  const resolveRequestUser = async (req: NextRequest) => config?.resolveRequestUser
    ? config.resolveRequestUser(req)
    : null;
  const requireAdmin = async (req: NextRequest) => {
    if (!config?.resolveRequestUser) return null;
    const requestUser = await resolveRequestUser(req);
    return requestUser?.isAdmin ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  };

  async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'list_user_tickets') {
      const requestUser = await resolveRequestUser(req);
      if (!requestUser?.email) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      const normalizedEmail = requestUser.email.toLowerCase();
      if (db && tables?.tickets) {
        try {
          const { and, desc, eq, ne, sql } = await import('drizzle-orm');
          const dbTickets = await db
            .select()
            .from(tables.tickets)
            .where(and(
              ne(tables.tickets.type, 'newsletter'),
              eq(sql`lower(${tables.tickets.userEmail})`, normalizedEmail),
            ))
            .orderBy(desc(tables.tickets.createdAt));
          return NextResponse.json({ tickets: dbTickets });
        } catch (e) {
          console.error('[Engage API User Tickets Fetch Error]:', e);
          return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 });
        }
      }

      return NextResponse.json({
        tickets: [...ticketStore]
          .filter((ticket) =>
            ticket.type !== 'newsletter' && ticket.userEmail?.toLowerCase() === normalizedEmail
          )
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      });
    }

    if (action === 'unsubscribe') {
      const userEmail = searchParams.get('email');
      if (userEmail) {
        if (db && tables?.subscribers) {
          try {
            const { eq } = await import('drizzle-orm');
            await db.delete(tables.subscribers).where(eq(tables.subscribers.email, userEmail));
          } catch (e) {
            console.error('[Engage API Unsubscribe GET Error]:', e);
          }
        }
        const idx = ticketStore.findIndex((t) => t.userEmail === userEmail);
        if (idx !== -1) ticketStore.splice(idx, 1);

        return new NextResponse(
          `<!DOCTYPE html><html><head><title>Unsubscribed</title></head><body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;"><div style="text-align: center; background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; max-width: 400px;"><h2 style="color: #38bdf8; margin-top: 0;">You're Unsubscribed</h2><p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">${userEmail} has been successfully removed from future newsletter broadcasts.</p></div></body></html>`,
          { headers: { 'content-type': 'text/html' } }
        );
      }
    }

    if (action === 'list_suggestions') {
      const userKey = searchParams.get('userKey') || (await resolveRequestUser(req))?.email || '';

      if (db && tables?.tickets) {
        try {
          const { desc, eq } = await import('drizzle-orm');
          const suggestions = await db
            .select()
            .from(tables.tickets)
            .where(eq(tables.tickets.type, 'suggestion'))
            .orderBy(desc(tables.tickets.upvotes), desc(tables.tickets.createdAt));

          let votedIds = new Set<string>();
          if (userKey && tables?.suggestionVotes) {
            const userVotes = await db
              .select({ suggestionId: tables.suggestionVotes.suggestionId })
              .from(tables.suggestionVotes)
              .where(eq(tables.suggestionVotes.userKey, userKey));
            votedIds = new Set(userVotes.map((v: any) => v.suggestionId));
          }

          const formatted = suggestions.map((s: any) => ({
            id: s.id,
            appId: s.appId,
            title: s.subject || 'Feature Suggestion',
            description: s.message,
            category: (s.category?.toLowerCase() as any) || 'new_feature',
            status: s.status || 'under_review',
            upvotes: Number(s.upvotes || 0),
            hasVoted: votedIds.has(s.id),
            userEmail: s.userEmail,
            userName: s.userName,
            createdAt: s.createdAt,
          }));

          return NextResponse.json({ suggestions: formatted });
        } catch (e) {
          console.error('[Engage API Suggestions Fetch Error]:', e);
        }
      }

      // Memory store fallback
      const suggestions = ticketStore
        .filter((t) => t.type === 'suggestion')
        .map((s) => ({
          id: s.id,
          appId: (s as any).appId || 'app',
          title: s.subject || 'Feature Suggestion',
          description: s.message,
          category: (s.category?.toLowerCase() as any) || 'new_feature',
          status: s.status || 'under_review',
          upvotes: Number((s as any).upvotes || 0),
          hasVoted: userKey ? globalSuggestionVoteStore.has(`${s.id}:${userKey}`) : false,
          userEmail: s.userEmail,
          userName: s.userName,
          createdAt: s.createdAt,
        }))
        .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));

      return NextResponse.json({ suggestions });
    }

    if (action === 'list_subscribers') {
      const forbidden = await requireAdmin(req);
      if (forbidden) return forbidden;
      if (db && tables?.subscribers) {
        try {
          const dbSubscribers = await db.select().from(tables.subscribers);
          return NextResponse.json({ subscribers: dbSubscribers });
        } catch (e) {
          console.error('[Engage API DB Subscribers Fetch Error]:', e);
        }
      }
      const subTickets = ticketStore.filter((t) => t.type === 'newsletter' || t.userEmail);
      return NextResponse.json({
        subscribers: subTickets.map((t) => ({
          id: t.id,
          email: t.userEmail,
          name: t.userName,
          status: 'Active',
          subscribedAt: t.createdAt,
        })),
      });
    }

    if (action === 'list_broadcasts') {
      const forbidden = await requireAdmin(req);
      if (forbidden) return forbidden;
      if (db && tables?.broadcasts) {
        try {
          const dbBroadcasts = await db.select().from(tables.broadcasts);
          return NextResponse.json({ broadcasts: dbBroadcasts.length > 0 ? dbBroadcasts : globalBroadcastStore });
        } catch (e) {
          console.error('[Engage API DB Broadcast Fetch Error]:', e);
        }
      }
      return NextResponse.json({ broadcasts: globalBroadcastStore });
    }

    if (action === 'list_tickets') {
      const forbidden = await requireAdmin(req);
      if (forbidden) return forbidden;
      if (db && tables?.tickets) {
        try {
          const { ne } = await import('drizzle-orm');
          const dbTickets = await db.select().from(tables.tickets).where(ne(tables.tickets.type, 'newsletter'));
          return NextResponse.json({ tickets: dbTickets.length > 0 ? dbTickets : ticketStore.filter(t => t.type !== 'newsletter') });
        } catch (e) {
          console.error('[Engage API DB Fetch Error]:', e);
        }
      }
      return NextResponse.json({ tickets: ticketStore.filter(t => t.type !== 'newsletter') });
    }

    const forbidden = await requireAdmin(req);
    if (forbidden) return forbidden;
    return NextResponse.json({ tickets: ticketStore });
  }

  async function POST(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const action = searchParams.get('action');
      const body = await req.json();

      const apiKey = getApiKey();
      const adminEmail = getAdminEmail();
      const senderEmail = getSenderEmail();
      const senderName = getSenderName();

      // 1. ADMIN ACTION: Send reply email to user
      if (action === 'send_reply') {
        const forbidden = await requireAdmin(req);
        if (forbidden) return forbidden;
        const { ticketId, userEmail, replyText } = body;
        console.log(`[Engage API] Sending support reply to ${userEmail} for ticket ${ticketId}`);

        // Update status in PostgreSQL if DB is connected
        if (db && tables?.tickets) {
          try {
            const { eq } = await import('drizzle-orm');
            await db.update(tables.tickets).set({ status: 'resolved' }).where(eq(tables.tickets.id, ticketId));
          } catch (e) {
            console.error('[Engage API DB Update Error]:', e);
          }
        }

        // Update in-memory fallback
        const t = ticketStore.find((item) => item.id === ticketId);
        if (t) {
          t.status = 'resolved';
        }

        if (apiKey && userEmail) {
          const replyEmail = emailContent?.renderReply?.({ ticketId, email: userEmail, replyText }) ?? {
            subject: '[Support Reply] Ticket Update',
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h3 style="color: #3b82f6; margin-top: 0;">Support Team Reply</h3>
                <p>Hello,</p>
                <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 14px; margin: 16px 0;">${replyText}</div>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Reply directly to this email if you have further questions.</p>
              </div>
            `,
          };
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: userEmail }],
              subject: replyEmail.subject,
              htmlContent: replyEmail.htmlContent,
            }),
          });
        }

        return NextResponse.json({ success: true, ticketId, status: 'resolved' });
      }

      // Community Suggestion Vote Action
      if (action === 'vote_suggestion') {
        const { suggestionId, userKey: rawUserKey, voteAction } = body;
        const requestUser = await resolveRequestUser(req);
        const userKey = rawUserKey || requestUser?.email || requestUser?.id || 'anonymous';

        if (!suggestionId) {
          return NextResponse.json({ error: 'Missing suggestionId' }, { status: 400 });
        }

        const isUpvote = voteAction !== 'unvote';

        if (db && tables?.tickets) {
          try {
            const { eq, and, sql } = await import('drizzle-orm');

            if (tables?.suggestionVotes) {
              if (isUpvote) {
                await db.insert(tables.suggestionVotes).values({
                  id: `vote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  suggestionId,
                  userKey,
                  createdAt: new Date().toISOString(),
                }).onConflictDoNothing();
              } else {
                await db.delete(tables.suggestionVotes).where(
                  and(
                    eq(tables.suggestionVotes.suggestionId, suggestionId),
                    eq(tables.suggestionVotes.userKey, userKey)
                  )
                );
              }
            }

            if (isUpvote) {
              await db.update(tables.tickets)
                .set({ upvotes: sql`COALESCE(${tables.tickets.upvotes}, 0) + 1` })
                .where(eq(tables.tickets.id, suggestionId));
            } else {
              await db.update(tables.tickets)
                .set({ upvotes: sql`GREATEST(0, COALESCE(${tables.tickets.upvotes}, 0) - 1)` })
                .where(eq(tables.tickets.id, suggestionId));
            }

            const [updated] = await db.select().from(tables.tickets).where(eq(tables.tickets.id, suggestionId));

            return NextResponse.json({
              success: true,
              suggestionId,
              upvotes: Number(updated?.upvotes || 0),
              hasVoted: isUpvote,
            });
          } catch (e) {
            console.error('[Engage API Vote Error]:', e);
          }
        }

        // Memory store fallback
        const voteKey = `${suggestionId}:${userKey}`;
        const ticket = ticketStore.find((t) => t.id === suggestionId);
        if (ticket) {
          (ticket as any).upvotes = (ticket as any).upvotes || 0;
          if (isUpvote) {
            if (!globalSuggestionVoteStore.has(voteKey)) {
              globalSuggestionVoteStore.add(voteKey);
              (ticket as any).upvotes += 1;
            }
          } else {
            if (globalSuggestionVoteStore.has(voteKey)) {
              globalSuggestionVoteStore.delete(voteKey);
              (ticket as any).upvotes = Math.max(0, (ticket as any).upvotes - 1);
            }
          }
        }

        return NextResponse.json({
          success: true,
          suggestionId,
          upvotes: ticket ? (ticket as any).upvotes : 0,
          hasVoted: isUpvote,
        });
      }

      // Update Suggestion Status (Admin)
      if (action === 'update_suggestion_status') {
        const forbidden = await requireAdmin(req);
        if (forbidden) return forbidden;

        const { suggestionId, status } = body;
        if (!suggestionId || !status) {
          return NextResponse.json({ error: 'Missing suggestionId or status' }, { status: 400 });
        }

        if (db && tables?.tickets) {
          try {
            const { eq } = await import('drizzle-orm');
            await db.update(tables.tickets)
              .set({ status })
              .where(eq(tables.tickets.id, suggestionId));
            return NextResponse.json({ success: true, suggestionId, status });
          } catch (e) {
            console.error('[Engage API Status Update Error]:', e);
          }
        }

        const ticket = ticketStore.find((t) => t.id === suggestionId);
        if (ticket) {
          ticket.status = status;
        }
        return NextResponse.json({ success: true, suggestionId, status });
      }

      // 2. ADMIN ACTION: Send newsletter broadcast to subscribers
      if (action === 'send_broadcast') {
        const forbidden = await requireAdmin(req);
        if (forbidden) return forbidden;
        const { subject, body: broadcastBody } = body;
        console.log(`[Engage API] Dispatching newsletter broadcast: ${subject}`);

        let subscribers: Array<{ email: string }> = [];
        if (db && tables?.subscribers) {
          try {
            subscribers = await db.select({ email: tables.subscribers.email }).from(tables.subscribers);
          } catch (e) {
            console.error('[Engage API DB Subscribers Fetch Error]:', e);
          }
        }

        if (subscribers.length === 0) {
          subscribers = ticketStore
            .filter((t) => t.userEmail)
            .map((t) => ({ email: t.userEmail as string }));
        }

        // Record sent broadcast entry in DB / memory
        const broadcastRecord: BroadcastRecord = {
          id: `bcast_${Date.now()}`,
          appId: 'app',
          subject,
          content: broadcastBody,
          recipientCount: subscribers.length,
          sentAt: new Date().toISOString(),
        };

        if (db && tables?.broadcasts) {
          try {
            await db.insert(tables.broadcasts).values(broadcastRecord);
          } catch (e) {
            console.error('[Engage API DB Broadcast Insert Error]:', e);
          }
        }
        globalBroadcastStore.unshift(broadcastRecord);

        if (apiKey && subscribers.length > 0) {
          const unsubscribeUrl = `${req.nextUrl.origin}/api/engage?action=unsubscribe&email={{contact.EMAIL}}`;
          const broadcastEmail = emailContent?.renderBroadcast?.({
            subject,
            content: broadcastBody,
            unsubscribeUrl,
          }) ?? {
            subject,
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #10b981; margin-top: 0;">Product Updates</h2>
                <div style="background: #f8fafc; padding: 16px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">${broadcastBody}</div>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center;">
                  <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
                </p>
              </div>
            `,
          };
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: subscribers,
              subject: broadcastEmail.subject,
              htmlContent: broadcastEmail.htmlContent,
            }),
          });
        }

        return NextResponse.json({ success: true, recipientCount: subscribers.length, broadcast: broadcastRecord });
      }

      // 3. WIDGET SUBMISSION: Bug, Ticket, Suggestion, or Newsletter
      const { type, payload } = body;
      console.log(`[Engage API] Received ${type} submission from app: ${payload?.appId || 'unknown'}`);

      const requestUser = await resolveRequestUser(req);
      const userEmail =
        payload?.email?.trim() ||
        payload?.user?.email?.trim() ||
        requestUser?.email?.trim() ||
        'Anonymous';
      const userName =
        payload?.name?.trim() ||
        payload?.user?.name?.trim() ||
        requestUser?.name?.trim() ||
        null;
      const userMessage = payload?.message || payload?.description || payload?.subject || 'Newsletter Subscription';
      const ticketId = `tkt_${Date.now()}`;

      const newTicketRecord = {
        id: ticketId,
        appId: payload?.appId || 'app',
        type: type || 'ticket',
        category: payload?.category ? String(payload.category).toUpperCase() : 'GENERAL',
        severity: payload?.severity || null,
        status: 'open',
        subject: payload?.subject || payload?.title || `${type} submission`,
        message: userMessage,
        userEmail,
        userName,
        attachments: payload?.attachments || null,
        environment: payload?.environment || null,
        createdAt: new Date().toISOString(),
      };

      // Handle Unsubscribe Action
      if (type === 'newsletter' && payload?.action === 'unsubscribe' && userEmail) {
        if (db && tables?.subscribers) {
          try {
            const { eq } = await import('drizzle-orm');
            await db.delete(tables.subscribers).where(eq(tables.subscribers.email, userEmail));
          } catch (e) {
            console.error('[Engage API DB Unsubscribe Error]:', e);
          }
        }
        const idx = ticketStore.findIndex((t) => t.userEmail === userEmail);
        if (idx !== -1) ticketStore.splice(idx, 1);
        return NextResponse.json({ success: true, unsubscribed: true, email: userEmail });
      }

      // Persist in DB if connected
      if (db) {
        try {
          if (type === 'newsletter' && tables?.subscribers && userEmail) {
            await db.insert(tables.subscribers).values({
              id: `sub_${Date.now()}`,
              appId: payload?.appId || 'app',
              email: userEmail,
              name: payload?.name || null,
              frequency: payload?.frequency || 'all',
              subscribedAt: new Date().toISOString(),
            }).onConflictDoUpdate({
              target: tables.subscribers.email,
              set: {
                name: payload?.name || null,
                frequency: payload?.frequency || 'all',
              },
            });
          }

          if (tables?.tickets && type !== 'newsletter') {
            await db.insert(tables.tickets).values(newTicketRecord);
          }
        } catch (e) {
          console.error('[Engage API DB Insert Error]:', e);
        }
      }

      // Always save to memory store for non-newsletter submissions
      if (type !== 'newsletter') {
        ticketStore.unshift(newTicketRecord as StoredTicket);
      }

      if (apiKey) {
        if (type === 'newsletter') {
          // Send Welcome Email to subscriber
          const welcomeEmail = emailContent?.renderWelcome?.({ email: userEmail, payload }) ?? {
            subject: 'Welcome to Updates!',
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #3b82f6; margin-top: 0;">Welcome aboard!</h2>
                <p>Thank you for subscribing to our updates.</p>
              </div>
            `,
          };
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: userEmail }],
              subject: welcomeEmail.subject,
              htmlContent: welcomeEmail.htmlContent,
            }),
          });
        } else {
          // Send Admin notification email
          const adminNotification = emailContent?.renderAdminNotification?.({
            type,
            category: newTicketRecord.category,
            userEmail,
            message: userMessage,
            payload,
          }) ?? {
            subject: `[${newTicketRecord.category}] New ${type} submission`,
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #3b82f6; margin-top: 0;">New Support Submission</h2>
                <p><strong>Type:</strong> ${type} (${newTicketRecord.category})</p>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                <h4 style="margin-bottom: 8px;">Message:</h4>
                <p style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 14px;">${userMessage}</p>
              </div>
            `,
          };

          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: adminEmail, name: emailContent?.adminRecipientName || 'Support Admin' }],
              replyTo: payload?.email ? { email: payload.email } : undefined,
              subject: adminNotification.subject,
              htmlContent: adminNotification.htmlContent,
            }),
          });
        }
      }

      return NextResponse.json({ success: true, ticketId, receivedAt: new Date().toISOString() });
    } catch (error) {
      console.error('[Engage API Error]:', error);
      return NextResponse.json({ success: false, error: 'Failed to process submission' }, { status: 500 });
    }
  }

  return { GET, POST };
}
