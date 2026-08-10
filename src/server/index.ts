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

export interface EngageServerConfig {
  apiKey?: string;
  adminEmail?: string;
  senderEmail?: string;
  senderName?: string;
}

// Memory store fallback for incoming ticket submissions
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

  async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'list_tickets') {
      return NextResponse.json({ tickets: globalTicketStore });
    }

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
        const { ticketId, userEmail, replyText } = body;
        console.log(`[Engage API] Sending support reply to ${userEmail} for ticket ${ticketId}`);

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
        const { subject, body: broadcastBody } = body;
        console.log(`[Engage API] Dispatching newsletter broadcast: ${subject}`);

        const subscribers = globalTicketStore
          .filter((t) => t.userEmail)
          .map((t) => ({ email: t.userEmail as string }));

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
                  <p style="font-size: 11px; color: #94a3b8; margin-top: 24px;">Sent via React Engage Suite.</p>
                </div>
              `,
            }),
          });
        }

        return NextResponse.json({ success: true, recipientCount: subscribers.length });
      }

      // 3. WIDGET SUBMISSION: Bug, Ticket, Suggestion, or Newsletter
      const { type, payload } = body;
      console.log(`[Engage API] Received ${type} submission from app: ${payload?.appId || 'unknown'}`);

      const userEmail = payload?.email || payload?.user?.email || 'Anonymous';
      const userMessage = payload?.message || payload?.description || payload?.subject || 'Newsletter Subscription';

      const newTicket: StoredTicket = {
        id: `tkt_${Date.now()}`,
        type: type || 'ticket',
        category: payload?.category ? String(payload.category).toUpperCase() : 'GENERAL',
        severity: payload?.severity,
        status: 'open',
        subject: payload?.subject || payload?.title || `${type} submission`,
        message: userMessage,
        userEmail,
        userName: payload?.name || payload?.user?.name,
        createdAt: new Date().toISOString(),
        environment: payload?.environment,
      };
      globalTicketStore.unshift(newTicket);

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
          const emailSubject = `[${newTicket.category}] New ${type} submission`;
          const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #3b82f6; margin-top: 0;">New Support Submission</h2>
              <p><strong>Type:</strong> ${type} (${newTicket.category})</p>
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

      return NextResponse.json({ success: true, ticketId: newTicket.id, receivedAt: new Date().toISOString() });
    } catch (error) {
      console.error('[Engage API Error]:', error);
      return NextResponse.json({ success: false, error: 'Failed to process submission' }, { status: 500 });
    }
  }

  return { GET, POST };
}
