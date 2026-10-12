import type { EmailTransport } from '../../email/types';

export class EmailDeliveryError extends Error {
  constructor(message: string, public readonly outcome: 'failed' | 'unknown', public readonly status = 502) {
    super(message);
  }
}

export function createBrevoEmailTransport(getApiKey: () => string | undefined): EmailTransport {
  return {
    async send(message) {
      const apiKey = getApiKey();
      if (!apiKey) throw new EmailDeliveryError('Email sending is not configured on this server.', 'failed', 503);
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
          body: JSON.stringify({
            sender: message.sender, replyTo: message.replyTo, to: [{ email: message.to }],
            subject: message.subject, textContent: message.text,
            ...(message.inReplyTo ? { headers: {
              'In-Reply-To': message.inReplyTo,
              References: message.references.join(' '),
            } } : {}),
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          const error = response.status === 429
            ? 'The sending limit was reached. Try again later.'
            : response.status === 401 || response.status === 403
              ? 'The email provider rejected the credentials. Check the server API key and sender verification.'
              : 'The email provider rejected this message. Check the sender, recipient, and account status.';
          throw new EmailDeliveryError(error, 'failed', response.status === 429 ? 429 : 502);
        }
        const result = await response.json();
        if (typeof result?.messageId !== 'string' || !result.messageId) throw new Error('Missing acknowledgement');
        return { messageId: result.messageId };
      } catch (error) {
        if (error instanceof EmailDeliveryError) throw error;
        throw new EmailDeliveryError('Sending could not be confirmed. Check the provider’s email logs before resending.', 'unknown');
      }
    },
  };
}
