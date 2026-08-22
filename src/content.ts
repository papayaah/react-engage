import type {
  CustomLabels,
  DeepPartial,
  EngageWidgetContent,
  EngageWidgetContentOverrides,
} from './types';

export const DEFAULT_ENGAGE_CONTENT: EngageWidgetContent = {
  launcher: {
    title: 'Help & Feedback',
    drawerAriaLabel: 'Help & Feedback Drawer',
    closeLabel: 'Close panel',
  },
  tabs: { faq: 'FAQ', support: 'Support', newsletter: 'Newsletter' },
  faq: {
    items: [],
    searchPlaceholder: 'Search help articles & FAQs...',
    emptyMessage: 'No help articles found.',
    readMoreLabel: 'Read Full Article',
  },
  feedback: {
    categories: { bug: 'Bug', suggestion: 'Suggestion', support: 'Support' },
    viewTicketsLabel: 'View my tickets',
    myTicketsLabel: 'My tickets',
    validation: {
      invalidEmail: 'Please provide a valid email address so our support team can reply.',
      missingSupportMessage: 'Please enter your support message.',
      missingSummary: 'Please fill in a brief summary or description.',
    },
    errors: { submitFailed: 'Failed to submit feedback' },
    payloadDefaults: {
      bugTitle: 'Bug Report',
      suggestionTitle: 'Feature Suggestion',
      supportSubject: 'Support Request',
    },
    success: {
      bugTitle: 'Bug Report Received!',
      suggestionTitle: 'Idea Submitted!',
      supportTitle: 'Support Ticket Received!',
      feedbackMessage: "Thank you! It's just me back here, so I'll personally read this and see what I can do. 🙏",
      supportMessage: "Thanks for reaching out! Quick heads-up — it's a one-person show here (hi, that's me 👋), so a reply might take a little while. But I read every message and I'll personally get back to you.",
      viewTicketsButton: 'View My Tickets',
      submitMoreButton: 'Submit More Feedback',
    },
    severityLabel: 'Severity (Optional)',
    severityOptions: {
      low: 'Low - Visual tweak or typo',
      medium: 'Medium - Workflow affected',
      high: 'High - Feature broken',
      critical: 'Critical - App crash',
    },
    suggestionTopicLabel: 'Topic (Optional)',
    suggestionTopicOptions: {
      new_feature: 'New Feature',
      ui_ux: 'UI / UX Enhancement',
      performance: 'Performance',
      integrations: 'Integrations',
      other: 'Other Idea',
    },
    messageLabels: { feedback: 'Description', support: 'Your Message' },
    messagePlaceholders: {
      bug: 'Describe what happened or the steps to reproduce it...',
      suggestion: 'What problem does this idea solve?',
      support: 'How can our team help you?',
    },
    emailLabels: { optional: 'Your Email (Optional)', required: 'Your Email *' },
    emailPlaceholder: 'name@example.com',
    attachmentsLabel: 'Attachments (Optional)',
    attachmentAction: 'Attach screenshot or file',
    telemetryNotice: 'Auto-attaching URL ({path}), browser ({browser}), and OS ({os}).',
    submitButtons: {
      submitting: 'Submitting...',
      bug: 'Submit Bug Report',
      suggestion: 'Submit Suggestion',
      support: 'Send Support Request',
    },
  },
  suggestions: {
    headerTitle: 'Feature Ideas & Roadmap',
    headerSubtitle: 'Vote on community suggestions or share your own idea.',
    createButton: 'New Idea',
    sortLabels: { top: 'Top Voted', recent: 'Recent', roadmap: 'Roadmap' },
    allTopicsLabel: 'All Topics',
    categoryLabels: {
      new_feature: 'Feature',
      ui_ux: 'UI / UX',
      performance: 'Performance',
      integrations: 'Integrations',
      other: 'Other',
    },
    statusLabels: {
      under_review: 'Under Review',
      planned: 'Planned',
      in_progress: 'In Progress',
      completed: 'Completed',
    },
    statusTooltips: {
      under_review: 'Under community review',
      planned: 'Planned for upcoming release',
      in_progress: 'Currently being built',
      completed: 'Feature released',
    },
    loadingMessage: 'Loading ideas...',
    emptyTitle: 'No suggestions found',
    emptyMessage: 'Be the first to suggest a new feature!',
    emptyCreateButton: 'Suggest an Idea',
    sampleItems: [],
  },
  tickets: {
    title: 'My tickets',
    submissionSingular: 'submission',
    submissionPlural: 'submissions',
    backLabel: 'Back to support form',
    refreshLabel: 'Refresh tickets',
    signInError: 'Sign in to view your tickets.',
    loadError: 'Unable to load your tickets.',
    signedOutTitle: 'Sign in to view your tickets',
    signedOutMessage: 'Tickets submitted while signed in will appear here with their latest status.',
    loadingMessage: 'Loading your tickets…',
    emptyTitle: 'No tickets yet',
    emptyMessage: 'Your bug reports, suggestions, and support requests will appear here.',
    typeLabels: { bug: 'Bug', suggestion: 'Suggestion', ticket: 'Support' },
    referenceLabel: 'Reference',
    replyNote: 'Support replies are sent to {email}. The status here updates when the team responds.',
  },
  newsletter: {
    validationEmail: 'Please enter a valid email address.',
    subscribeError: 'Failed to subscribe',
    unsubscribeError: 'Failed to unsubscribe',
    unsubscribedTitle: "You've Unsubscribed",
    unsubscribedMessage: 'You have been removed from our newsletter list ({email}). You will no longer receive product updates.',
    resubscribeButton: 'Re-subscribe to Newsletter',
    subscribedTitle: "You're Subscribed!",
    subscribedMessage: 'Thank you for subscribing! Check your inbox for updates and product releases.',
    subscribedEmailLabel: 'Subscribed Email',
    manageButton: 'Manage Preferences',
    subscribeTitle: 'Product Updates & Newsletter',
    subscribeDescription: 'Get new features and useful updates straight to your inbox.',
    manageTitle: 'Update Subscription Preferences',
    manageDescription: 'Modify frequency or unsubscribe from emails.',
    emailLabel: 'Your Email',
    useAccountEmail: 'Use account email ({email})',
    emailPlaceholder: 'name@example.com',
    nameLabel: 'Your Name (Optional)',
    namePlaceholder: 'e.g. Alex',
    frequencyLabel: 'Email Frequency',
    frequencyOptions: {
      all: 'All Updates & Product News',
      weekly: 'Weekly Summary Digest',
      monthly: 'Monthly Major Releases Only',
    },
    savingButton: 'Saving...',
    savePreferencesButton: 'Save Updated Preferences',
    subscribeButton: 'Subscribe to Newsletter',
    unsubscribeButton: 'Unsubscribe from Newsletter',
  },
};

function mergeContent<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) return base;
  if (Array.isArray(base) || typeof base !== 'object' || base === null) {
    return (overrides ?? base) as T;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (value === undefined) continue;
    const baseValue = result[key];
    result[key] = Array.isArray(value)
      ? value
      : value && typeof value === 'object' && baseValue && typeof baseValue === 'object'
        ? mergeContent(baseValue, value as DeepPartial<typeof baseValue>)
        : value;
  }
  return result as T;
}

/** Resolve partial host copy plus the deprecated flat labels API into complete widget content. */
export function resolveEngageContent(
  overrides?: EngageWidgetContentOverrides,
  labels?: CustomLabels,
): EngageWidgetContent {
  const legacyOverrides: EngageWidgetContentOverrides = {
    launcher: labels?.launcherTitle ? { title: labels.launcherTitle } : undefined,
    tabs: {
      faq: labels?.faqTabTitle,
      support: labels?.feedbackTabTitle || labels?.bugTabTitle || labels?.ticketTabTitle,
      newsletter: labels?.newsletterTabTitle,
    },
    feedback: {
      myTicketsLabel: labels?.myTicketsTabTitle,
      submitButtons: labels?.submitButton
        ? { bug: labels.submitButton, suggestion: labels.submitButton, support: labels.submitButton }
        : undefined,
      success: labels?.successMessage
        ? { feedbackMessage: labels.successMessage, supportMessage: labels.successMessage }
        : undefined,
    },
  };
  const withLegacy = mergeContent<EngageWidgetContent>(DEFAULT_ENGAGE_CONTENT, legacyOverrides);
  return mergeContent<EngageWidgetContent>(withLegacy, overrides);
}

export function interpolateContent(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}
