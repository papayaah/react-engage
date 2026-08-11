# @reactkits.dev/react-engage

A lightweight, reskinnable, embeddable React component package for user engagement: feedback widgets, bug reporting with auto-telemetry, feature suggestions, announcements, FAQs, and support ticketing.

## Installation

```bash
npm install @reactkits.dev/react-engage lucide-react
```

## Quick Start

Import the widget and styles near your application root:

```tsx
import { EngageWidget } from '@reactkits.dev/react-engage';
import '@reactkits.dev/react-engage/styles.css';

export default function App() {
  return (
    <EngageWidget
      appId="my-app"
      position="bottom-right"
      theme="inherit"
      endpointUrl="/api/engage"
    />
  );
}
```

## Core Exports

- `EngageWidget`: Embedded floating engagement widget.
- `EngageAdminPanel`: In-app admin view for managing broadcasts, feedback, and support tickets.
- `@reactkits.dev/react-engage/server`: Server route handlers (`createFetchHandler`, `createExpressHandler`).

## Features

- **Multi-channel**: Announcements/Broadcasts, Feedback/Suggestions, Bug Reports with auto-telemetry, and Support Tickets.
- **Theme Support**: Supports `inherit`, `system`, `light`, and `dark` modes with semantic tokens.
- **Server Handlers**: Plug-and-play route handlers for Next.js, Express, and Fetch API backends.
