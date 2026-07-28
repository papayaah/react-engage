# @reactkits.dev/react-feedbox

A lightweight, reskinnable, embeddable React component package for feedback, bug reporting with auto-telemetry, feature suggestions, FAQs, and support ticketing.

## Installation

```bash
npm install @reactkits.dev/react-feedbox lucide-react
```

## Quick Start

Import the component and its stylesheet near your application root:

```tsx
import { FeedbackWidget } from '@reactkits.dev/react-feedbox';
import '@reactkits.dev/react-feedbox/styles.css';

export default function App() {
  return (
    <div>
      {/* Your Application Content */}

      <FeedbackWidget
        appId="my-awesome-app"
        position="bottom-right" // "bottom-right" | "bottom-left" | "top-right" | "top-left"
        theme="inherit"        // "inherit" | "system" | "light" | "dark"
        user={{
          id: "user_123",
          name: "Trader Jane",
          email: "jane@example.com",
        }}
        onSubmitBug={async (payload) => {
          console.log('Bug Report:', payload);
          // Send to your backend, Webhook, GitHub Issue, or Supabase
        }}
        onSubmitSuggestion={async (payload) => {
          console.log('Suggestion:', payload);
        }}
        onSubmitTicket={async (payload) => {
          console.log('Support Ticket:', payload);
        }}
      />
    </div>
  );
}
```

## Features

- **4-in-1 Support Hub**: FAQs/Help, Bug Reports, Suggestion Box, and Support Tickets.
- **Telemetry Capture**: Automatically attaches current route, browser, OS, viewport size, screen resolution, and timestamp to bug reports.
- **Theme Support**: Seamlessly adopts light and dark modes via semantic CSS tokens (`inherit` mode maps to host application CSS variables).
- **Custom Reskinnable**: Configure trigger placement, labels, accent colors, and custom button triggers.
