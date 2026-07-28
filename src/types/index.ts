export type WidgetTheme = 'inherit' | 'system' | 'light' | 'dark';
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type TabId = 'faq' | 'bug' | 'suggestion' | 'ticket';

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionCategory = 'ui_ux' | 'new_feature' | 'performance' | 'integrations' | 'other';

export interface WidgetUser {
  id?: string;
  name?: string;
  email?: string;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

export interface EnvironmentMeta {
  url: string;
  path: string;
  referrer: string;
  userAgent: string;
  browser: string;
  os: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  timestamp: string;
  themeMode: 'light' | 'dark';
}

export interface BugReportPayload {
  appId: string;
  title: string;
  description: string;
  severity: BugSeverity;
  user?: WidgetUser;
  attachments?: Attachment[];
  environment: EnvironmentMeta;
}

export interface SuggestionPayload {
  appId: string;
  title: string;
  category: SuggestionCategory;
  description: string;
  user?: WidgetUser;
  timestamp: string;
}

export interface TicketPayload {
  appId: string;
  subject: string;
  message: string;
  category?: string;
  user?: WidgetUser;
  timestamp: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  externalUrl?: string;
}

export interface CustomLabels {
  launcherTitle?: string;
  faqTabTitle?: string;
  bugTabTitle?: string;
  suggestionTabTitle?: string;
  ticketTabTitle?: string;
  submitButton?: string;
  successMessage?: string;
}

export interface FeedbackWidgetProps {
  /** Unique ID for the host app submitting feedback */
  appId?: string;
  /** Positioning on screen */
  position?: WidgetPosition;
  /** Visual theme mode */
  theme?: WidgetTheme;
  /** Authenticated user details */
  user?: WidgetUser;
  /** FAQs/help items list */
  faqs?: FaqItem[];
  /** Enabled tabs. Defaults to all tabs if omitted */
  enabledTabs?: TabId[];
  /** Initial active tab when drawer opens */
  defaultTab?: TabId;
  /** Custom text overrides */
  labels?: CustomLabels;
  /** Primary accent color override (CSS hex or var) */
  accentColor?: string;
  /** Webhook URL or endpoint for automatic REST submission */
  endpointUrl?: string;
  /** Callback triggered when a bug report is submitted */
  onSubmitBug?: (payload: BugReportPayload) => Promise<void> | void;
  /** Callback triggered when a suggestion is submitted */
  onSubmitSuggestion?: (payload: SuggestionPayload) => Promise<void> | void;
  /** Callback triggered when a support ticket is submitted */
  onSubmitTicket?: (payload: TicketPayload) => Promise<void> | void;
  /** Optional custom trigger render button */
  renderTrigger?: (props: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
}
