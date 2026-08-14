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

export interface EngageServerConfig {
  apiKey?: string;
  adminEmail?: string;
  senderEmail?: string;
  senderName?: string;
  /** Resolve the authenticated host-app user for user-scoped and admin requests. */
  resolveRequestUser?: (request: NextRequest) => Promise<EngageRequestUser | null> | EngageRequestUser | null;
  db?: any;
  tables?: {
    tickets?: any;
    subscribers?: any;
    templates?: any;
    broadcasts?: any;
  };
}

const globalBroadcastStore: BroadcastRecord[] = [];

// Memory store fallback for standalone app without DB
const globalTicketStore: StoredTicket[] = [
  {
    id: 'tkt_001',
    type: 'bug',
    category: 'BUG',
    severity: 'high',
    status: 'open',
    subject: 'IBKR CSV import failing on split orders',
    message: 'When uploading my trade execution report from Interactive Brokers, split buy orders cause a validation error.',
    userEmail: 'trader.alex@example.com',
    userName: 'Alex Trader',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    environment: {
      path: '/import',
      browser: 'Chrome 124.0',
      os: 'macOS 14.5',
      screenResolution: '2560x1440',
    },
  },
  {
    id: 'tkt_002',
    type: 'suggestion',
    category: 'FEATURE',
    status: 'open',
    subject: 'Add cumulative P&L chart comparison',
    message: 'Would love to compare my cumulative P&L against the S&P 500 benchmark on the dashboard.',
    userEmail: 'sarah.quant@example.com',
    userName: 'Sarah Q',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function createEngageRouteHandler(config?: EngageServerConfig) {
  const db = config?.db;
  const tables = config?.tables;

  const getApiKey = () => config?.apiKey || process.env.ENGAGE_API_KEY || process.env.BREVO_API_KEY;
  const getAdminEmail = () =>
    config?.adminEmail ||
    process.env.ENGAGE_ADMIN_EMAIL ||
    process.env.ENGAGE_NOTIFICATION_EMAIL ||
    process.env.ENGAGE_RECIPIENT_EMAIL ||
    process.env.FEEDBACK_RECIPIENT_EMAIL ||
    'hello@tradingdiary.app';
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
    'Trading Diary Support';
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
        tickets: [...globalTicketStore]
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
        const idx = globalTicketStore.findIndex((t) => t.userEmail === userEmail);
        if (idx !== -1) globalTicketStore.splice(idx, 1);

        return new NextResponse(
          `<!DOCTYPE html><html><head><title>Unsubscribed</title></head><body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;"><div style="text-align: center; background: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155; max-width: 400px;"><h2 style="color: #38bdf8; margin-top: 0;">You're Unsubscribed</h2><p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">${userEmail} has been successfully removed from future newsletter broadcasts.</p></div></body></html>`,
          { headers: { 'content-type': 'text/html' } }
        );
      }
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
      const subTickets = globalTicketStore.filter((t) => t.type === 'newsletter' || t.userEmail);
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
          return NextResponse.json({ tickets: dbTickets.length > 0 ? dbTickets : globalTicketStore.filter(t => t.type !== 'newsletter') });
        } catch (e) {
          console.error('[Engage API DB Fetch Error]:', e);
        }
      }
      return NextResponse.json({ tickets: globalTicketStore.filter(t => t.type !== 'newsletter') });
    }

    const forbidden = await requireAdmin(req);
    if (forbidden) return forbidden;
    return NextResponse.json({ tickets: globalTicketStore });
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
        const t = globalTicketStore.find((item) => item.id === ticketId);
        if (t) {
          t.status = 'resolved';
        }

        if (apiKey && userEmail) {
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
              subject: `[Support Reply] Ticket Update`,
              htmlContent: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h3 style="color: #3b82f6; margin-top: 0;">Support Team Reply</h3>
                  <p>Hello,</p>
                  <div style="background: #f8fafc; padding: 14px; border-radius: 6px; font-size: 14px; margin: 16px 0;">${replyText}</div>
                  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">Reply directly to this email if you have further questions.</p>
                </div>
              `,
            }),
          });
        }

        return NextResponse.json({ success: true, ticketId, status: 'resolved' });
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
          subscribers = globalTicketStore
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
              subject: subject,
              htmlContent: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #10b981; margin-top: 0;">Product Updates 🚀</h2>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">${broadcastBody}</div>
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; text-align: center;">
                      Sent via Trading Diary • <a href="${req.nextUrl.origin}/api/engage?action=unsubscribe&email={{contact.EMAIL}}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </div>
              `,
            }),
          });
        }

        return NextResponse.json({ success: true, recipientCount: subscribers.length, broadcast: broadcastRecord });
      }

      // 3. WIDGET SUBMISSION: Bug, Ticket, Suggestion, or Newsletter
      const { type, payload } = body;
      console.log(`[Engage API] Received ${type} submission from app: ${payload?.appId || 'unknown'}`);

      const requestUser = await resolveRequestUser(req);
      const userEmail = requestUser?.email || payload?.email || payload?.user?.email || 'Anonymous';
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
        userName: requestUser?.name || payload?.name || payload?.user?.name || null,
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
        const idx = globalTicketStore.findIndex((t) => t.userEmail === userEmail);
        if (idx !== -1) globalTicketStore.splice(idx, 1);
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
        globalTicketStore.unshift(newTicketRecord as StoredTicket);
      }

      if (apiKey) {
        if (type === 'newsletter') {
          // Send Welcome Email to subscriber
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
              subject: 'Welcome to Updates! 🎉',
              htmlContent: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #3b82f6; margin-top: 0;">Welcome aboard! 🎉</h2>
                  <p>Thank you for subscribing to our updates. We will send you new feature releases and insights.</p>
                </div>
              `,
            }),
          });
        } else {
          // Send Admin notification email
          const emailSubject = `[${newTicketRecord.category}] New ${type} submission`;
          const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #3b82f6; margin-top: 0;">New Support Submission</h2>
              <p><strong>Type:</strong> ${type} (${newTicketRecord.category})</p>
              <p><strong>User Email:</strong> ${userEmail}</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              <h4 style="margin-bottom: 8px;">Message:</h4>
              <p style="white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 14px;">${userMessage}</p>
            </div>
          `;

          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: adminEmail, name: 'Support Admin' }],
              replyTo: payload?.email ? { email: payload.email } : undefined,
              subject: emailSubject,
              htmlContent: htmlBody,
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
