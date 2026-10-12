# Cloudflare incoming email adapter

This adapter receives email addressed to your business mailbox and posts it to
an Engage helpdesk. It can also forward the complete original email, including
attachments, to your existing Gmail or other mailbox. It does not need Gmail
OAuth, IMAP, or SMTP passwords.

1. Run `npm install` in this directory.
2. Edit `ENGAGE_ENDPOINT`, `MAILBOX_ADDRESS`, and optional `FORWARD_TO` in
   `wrangler.toml`. The destination for forwarded copies must already be
   verified in Cloudflare Email Routing.
3. Create retry storage with `npx wrangler kv namespace create INBOUND_RETRY`.
   Replace the all-zero namespace ID in `wrangler.toml` with the returned ID.
4. Generate a random secret of at least 32 characters. Set the same value as
   `ENGAGE_INBOUND_SECRET` on your application server and through
   `npx wrangler secret put ENGAGE_INBOUND_SECRET` for this Worker. Keep it out
   of React props, checked-in configuration, and chat.
5. Apply the host application's email-message database schema, then restart or
   redeploy the application with its existing provider API key and sender.
6. Run `npm run check` to bundle without deployment, then `npm run deploy`.
7. In Cloudflare Email Routing, change the business address's destination to
   this Worker. Keep `FORWARD_TO` configured if you want mailbox backup copies.
8. Send a test email to the business address and verify the inbox, forwarded
   copy, reply threading, and sent history before relying on this workflow.

The Worker reserves normalized text/metadata in KV before HTTP ingestion and
retries retained messages every five minutes. The endpoint must use HTTPS.
Payloads rejected as invalid are retained under `rejected:email:` in KV for
review rather than retried indefinitely.
Engage deduplicates by Message-ID, so retries do not create extra tickets.
The initial interface stores text and attachment metadata, not attachment
binaries. Emails exceeding the 10 MiB parsing limit remain in the forwarded
copy; they are not ingested. KV/Workers plan limits apply.

Use [Cloudflare's Email Routing setup](https://developers.cloudflare.com/email-service/get-started/route-emails/)
for domain routing and verified forwarding destinations.
