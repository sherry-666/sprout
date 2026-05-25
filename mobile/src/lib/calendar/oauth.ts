/**
 * Google / Microsoft OAuth connect flow via expo-web-browser.
 * Opens the provider auth URL, waits for the sprout:// deep link redirect.
 */
import * as WebBrowser from 'expo-web-browser';
import { gql } from '@apollo/client';

export const BEGIN_CALENDAR_OAUTH = gql`
  mutation BeginCalendarOAuth($provider: CalendarProvider!) {
    beginCalendarOAuth(provider: $provider) {
      authorizationUrl
    }
  }
`;

export const REGISTER_APPLE_CALENDAR = gql`
  mutation RegisterAppleCalendar {
    registerAppleCalendar {
      id
      provider
      providerAccountEmail
      lastSyncedAt
      createdAt
    }
  }
`;

export const DELINK_CALENDAR = gql`
  mutation DelinkCalendar($integrationId: ID!) {
    delinkCalendar(integrationId: $integrationId)
  }
`;

export const SYNC_CALENDAR_NOW = gql`
  mutation SyncCalendarNow($integrationId: ID!) {
    syncCalendarNow(integrationId: $integrationId) {
      id
      lastSyncedAt
    }
  }
`;

export const MY_CALENDAR_INTEGRATIONS = gql`
  query MyCalendarIntegrations {
    myCalendarIntegrations {
      id
      provider
      providerAccountEmail
      lastSyncedAt
      createdAt
    }
  }
`;

export const MY_CALENDAR_EVENTS = gql`
  query MyCalendarEvents($fromDt: DateTime!, $toDt: DateTime!) {
    myCalendarEvents(fromDt: $fromDt, toDt: $toDt) {
      id
      provider
      title
      start
      end
      allDay
      location
    }
  }
`;

/**
 * Open the OAuth authorization URL in the system browser.
 * Returns 'success' if the deep link fired, 'cancelled' otherwise.
 */
export async function openOAuthBrowser(authUrl: string): Promise<'success' | 'cancelled' | 'error'> {
  try {
    const result = await WebBrowser.openAuthSessionAsync(authUrl, 'sprout://oauth-success');
    if (result.type === 'success') return 'success';
    if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled';
    return 'error';
  } catch {
    return 'error';
  }
}
