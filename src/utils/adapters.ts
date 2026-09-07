import { BugReportPayload, SuggestionPayload, TicketPayload, NewsletterPayload } from '../types';

export interface EndpointSubmissionResult {
  success?: boolean;
  ticketId?: string;
  status?: string;
  [key: string]: unknown;
}

export async function sendPayloadToEndpoint(
  endpointUrl: string,
  type: 'bug' | 'suggestion' | 'ticket' | 'newsletter',
  payload: BugReportPayload | SuggestionPayload | TicketPayload | NewsletterPayload
): Promise<EndpointSubmissionResult> {
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send ${type} report to endpoint: ${response.statusText}`);
  }

  try {
    return (await response.json()) as EndpointSubmissionResult;
  } catch {
    return { success: true };
  }
}

