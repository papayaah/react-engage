export type WidgetTheme = 'inherit' | 'system' | 'light' | 'dark';
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type TabId = 'faq' | 'feedback' | 'bug' | 'suggestion' | 'ticket' | 'newsletter';

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionCategory = 'ui_ux' | 'new_feature' | 'performance' | 'integrations' | 'other';
export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'support';

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

export interface FeedbackPayload {
  appId: string;
  category: FeedbackCategory;
  message: string;
  email?: string;
  user?: WidgetUser;
  attachments?: Attachment[];
  timestamp: string;
}

export interface BugReportPayload {
  appId: string;
  title: string;
  description: string;
  severity: BugSeverity;
  email?: string;
  name?: string;
  user?: WidgetUser;
  attachments?: Attachment[];
  environment: EnvironmentMeta;
}

export interface SuggestionPayload {
  appId: string;
  title: string;
  category: SuggestionCategory;
  description: string;
  email?: string;
  name?: string;
  user?: WidgetUser;
  attachments?: Attachment[];
  timestamp: string;
}

export interface TicketPayload {
  appId: string;
  subject: string;
  message: string;
  category?: string;
  email?: string;
  name?: string;
  user?: WidgetUser;
  attachments?: Attachment[];
  timestamp: string;
}

export type SuggestionStatus = 'under_review' | 'planned' | 'in_progress' | 'completed' | 'open';

export interface SuggestionItem {
  id: string;
  appId: string;
  title: string;
  description: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  upvotes: number;
  hasVoted?: boolean;
  userEmail?: string;
  userName?: string;
  createdAt: string;
}

export interface EngageTicket {
  id: string;
  type: 'bug' | 'suggestion' | 'ticket';
  category?: string;
  severity?: BugSeverity;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  subject?: string;
  message: string;
  attachments?: Attachment[];
  upvotes?: number;
  createdAt: string;
}

export interface NewsletterPayload {
  appId: string;
  email: string;
  name?: string;
  frequency?: 'all' | 'weekly' | 'monthly';
  action?: 'subscribe' | 'unsubscribe';
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

export interface EngageWidgetContent {
  launcher: {
    title: string;
    drawerAriaLabel: string;
    closeLabel: string;
  };
  tabs: {
    faq: string;
    support: string;
    newsletter: string;
  };
  faq: {
    items: FaqItem[];
    searchPlaceholder: string;
    emptyMessage: string;
    readMoreLabel: string;
  };
  feedback: {
    categories: Record<'bug' | 'suggestion' | 'support', string>;
    viewTicketsLabel: string;
    myTicketsLabel: string;
    validation: {
      invalidEmail: string;
      missingSupportMessage: string;
      missingSummary: string;
    };
    errors: {
      submitFailed: string;
    };
    payloadDefaults: {
      bugTitle: string;
      suggestionTitle: string;
      supportSubject: string;
    };
    success: {
      bugTitle: string;
      suggestionTitle: string;
      supportTitle: string;
      feedbackMessage: string;
      supportMessage: string;
      viewTicketsButton: string;
      submitMoreButton: string;
    };
    severityLabel: string;
    severityOptions: Record<BugSeverity, string>;
    suggestionTopicLabel: string;
    suggestionTopicOptions: Record<SuggestionCategory, string>;
    messageLabels: Record<'feedback' | 'support', string>;
    messagePlaceholders: Record<'bug' | 'suggestion' | 'support', string>;
    emailLabels: Record<'optional' | 'required', string>;
    emailPlaceholder: string;
    attachmentsLabel: string;
    attachmentAction: string;
    telemetryNotice: string;
    submitButtons: Record<'submitting' | 'bug' | 'suggestion' | 'support', string>;
  };
  suggestions: {
    headerTitle: string;
    headerSubtitle: string;
    createButton: string;
    sortLabels: Record<'top' | 'recent' | 'roadmap', string>;
    allTopicsLabel: string;
    categoryLabels: Record<SuggestionCategory, string>;
    statusLabels: Record<'under_review' | 'planned' | 'in_progress' | 'completed', string>;
    statusTooltips: Record<'under_review' | 'planned' | 'in_progress' | 'completed', string>;
    loadingMessage: string;
    emptyTitle: string;
    emptyMessage: string;
    emptyCreateButton: string;
    /** Fallback community suggestions shown when no endpoint data is available. Defaults to none. */
    sampleItems: SuggestionItem[];
  };
  tickets: {
    title: string;
    submissionSingular: string;
    submissionPlural: string;
    backLabel: string;
    refreshLabel: string;
    signInError: string;
    loadError: string;
    signedOutTitle: string;
    signedOutMessage: string;
    loadingMessage: string;
    emptyTitle: string;
    emptyMessage: string;
    typeLabels: Record<'bug' | 'suggestion' | 'ticket', string>;
    referenceLabel: string;
    replyNote: string;
  };
  newsletter: {
    validationEmail: string;
    subscribeError: string;
    unsubscribeError: string;
    unsubscribedTitle: string;
    unsubscribedMessage: string;
    resubscribeButton: string;
    subscribedTitle: string;
    subscribedMessage: string;
    subscribedEmailLabel: string;
    manageButton: string;
    subscribeTitle: string;
    subscribeDescription: string;
    manageTitle: string;
    manageDescription: string;
    emailLabel: string;
    useAccountEmail: string;
    emailPlaceholder: string;
    nameLabel: string;
    namePlaceholder: string;
    frequencyLabel: string;
    frequencyOptions: Record<'all' | 'weekly' | 'monthly', string>;
    savingButton: string;
    savePreferencesButton: string;
    subscribeButton: string;
    unsubscribeButton: string;
  };
}

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type EngageWidgetContentOverrides = DeepPartial<EngageWidgetContent>;

export interface CustomLabels {
  launcherTitle?: string;
  faqTabTitle?: string;
  feedbackTabTitle?: string;
  bugTabTitle?: string;
  suggestionTabTitle?: string;
  ticketTabTitle?: string;
  newsletterTabTitle?: string;
  myTicketsTabTitle?: string;
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
  /** FAQs/help items list. Prefer content.faq.items for new integrations. */
  faqs?: FaqItem[];
  /** All host-facing widget copy and help content. Partial overrides are deep-merged with defaults. */
  content?: EngageWidgetContentOverrides;
  /** Enabled tabs. Defaults to ['faq', 'feedback', 'newsletter'] */
  enabledTabs?: TabId[];
  /** Initial active tab when drawer opens */
  defaultTab?: TabId;
  /** @deprecated Prefer the comprehensive content prop. */
  labels?: CustomLabels;
  /** Primary accent color override (CSS hex or var) */
  accentColor?: string;
  /** Webhook URL or endpoint for automatic REST submission */
  endpointUrl?: string;
  /** Callback triggered when feedback is submitted */
  onSubmitFeedback?: (payload: FeedbackPayload) => Promise<void> | void;
  /** Callback triggered when a bug report is submitted */
  onSubmitBug?: (payload: BugReportPayload) => Promise<void> | void;
  /** Callback triggered when a suggestion is submitted */
  onSubmitSuggestion?: (payload: SuggestionPayload) => Promise<void> | void;
  /** Callback triggered when voting on a community suggestion */
  onVoteSuggestion?: (suggestionId: string, action: 'upvote' | 'unvote') => Promise<void> | void;
  /** Allow browsing community suggestions and voting directly in the widget (defaults to true) */
  enableCommunityRoadmap?: boolean;
  /** Callback triggered when a support ticket is submitted */
  onSubmitTicket?: (payload: TicketPayload) => Promise<void> | void;
  /** Callback triggered when a user subscribes to the newsletter */
  onSubmitNewsletter?: (payload: NewsletterPayload) => Promise<void> | void;
  /** Optional custom trigger render button */
  renderTrigger?: (props: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  /** Custom bottom distance offset (e.g. "80px" to elevate above mobile bottom nav) */
  offsetBottom?: string;
  /** Custom left distance offset */
  offsetLeft?: string;
  /** Custom right distance offset */
  offsetRight?: string;
  /** Automatically collapse launcher to icon-only on mobile screens (defaults to true) */
  mobileCollapse?: boolean;
  /** Force launcher to display as an icon-only button on all screen sizes */
  iconOnly?: boolean;
  /** Corner radius style. Defaults to 'inherit' which respects host --radius or sharp 0px */
  corners?: 'sharp' | 'rounded' | 'inherit';
}

export type EngageWidgetProps = FeedbackWidgetProps;
