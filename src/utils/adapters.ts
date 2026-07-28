import { BugReportPayload, SuggestionPayload, TicketPayload } from '../types';

export async function sendPayloadToEndpoint(
  endpointUrl: string,
  type: 'bug' | 'suggestion' | 'ticket',
  payload: BugReportPayload | SuggestionPayload | TicketPayload
): Promise<void> {
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
}
