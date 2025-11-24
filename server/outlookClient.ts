// Outlook integration using Microsoft Graph API with Azure App Registration
import { Client } from '@microsoft/microsoft-graph-client';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  // Check if cached token is still valid
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    console.log('[Outlook] Using cached access token');
    return tokenCache.accessToken;
  }

  // Get Azure credentials from environment
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const tenantId = process.env.AZURE_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing Azure credentials: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, or AZURE_TENANT_ID not found in environment');
  }

  console.log('[Outlook] Fetching new access token from Azure...');

  // Use Client Credentials OAuth flow to get access token
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Outlook] Token fetch error:', response.status, errorText);
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 3600; // Token expires in seconds (default 1 hour)

  if (!accessToken) {
    throw new Error('No access token received from Azure');
  }

  // Cache the token with expiration time (subtract 5 minutes for safety margin)
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + (expiresIn * 1000) - (5 * 60 * 1000),
  };

  console.log('[Outlook] New access token obtained, expires in', expiresIn, 'seconds');
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getOutlookClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface OutlookMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
}

/**
 * Fetch emails from a specific mailbox folder
 */
export async function fetchEmails(
  folderName: 'inbox' | 'sentitems' = 'inbox',
  options: {
    top?: number;
    skip?: number;
    filter?: string;
    orderBy?: string;
  } = {}
): Promise<OutlookMessage[]> {
  const client = await getOutlookClient();
  
  const {
    top = 50,
    skip = 0,
    filter,
    orderBy = 'receivedDateTime DESC'
  } = options;

  // Query sales mailbox directly using CONFIG_EMAIL instead of authenticated user's mailbox
  const salesEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';
  
  let request = client
    .api(`/users/${salesEmail}/mailFolders/${folderName}/messages`)
    .top(top)
    .skip(skip)
    .orderby(orderBy)
    .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,hasAttachments');

  if (filter) {
    request = request.filter(filter);
  }

  const response = await request.get();
  return response.value as OutlookMessage[];
}

/**
 * Fetch a specific email by ID
 */
export async function fetchEmailById(messageId: string): Promise<OutlookMessage> {
  const client = await getOutlookClient();
  
  const salesEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';
  
  const message = await client
    .api(`/users/${salesEmail}/messages/${messageId}`)
    .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,hasAttachments')
    .get();

  return message as OutlookMessage;
}

/**
 * Fetch all messages in a conversation thread
 */
export async function fetchConversationThread(conversationId: string): Promise<OutlookMessage[]> {
  const client = await getOutlookClient();
  
  const salesEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';
  
  const response = await client
    .api(`/users/${salesEmail}/messages`)
    .filter(`conversationId eq '${conversationId}'`)
    .orderby('receivedDateTime ASC')
    .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,hasAttachments')
    .get();

  return response.value as OutlookMessage[];
}

/**
 * Send an email
 */
export async function sendEmail(params: {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  from?: string;
}): Promise<void> {
  const client = await getOutlookClient();
  
  // Send from sales email directly
  const salesEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';

  const message = {
    subject: params.subject,
    body: {
      contentType: 'HTML',
      content: params.body,
    },
    toRecipients: params.to.map(email => ({
      emailAddress: { address: email }
    })),
    ccRecipients: params.cc?.map(email => ({
      emailAddress: { address: email }
    })),
    bccRecipients: params.bcc?.map(email => ({
      emailAddress: { address: email }
    })),
  };

  // Send email from sales mailbox directly
  await client.api(`/users/${salesEmail}/sendMail`).post({
    message,
    saveToSentItems: true,
  });
}

/**
 * Reply to an email
 */
export async function replyToEmail(messageId: string, comment: string): Promise<void> {
  const client = await getOutlookClient();
  
  const salesEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';

  await client.api(`/users/${salesEmail}/messages/${messageId}/reply`).post({
    comment,
  });
}

/**
 * Mark email as read/unread
 */
export async function markEmailAsRead(messageId: string, isRead: boolean = true): Promise<void> {
  const client = await getOutlookClient();
  
  const salesEmail = process.env.CONFIG_EMAIL || 'sales@hackure.in';

  await client.api(`/users/${salesEmail}/messages/${messageId}`).patch({
    isRead,
  });
}
