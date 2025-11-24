// Outlook integration using Microsoft Graph API via Replit connector
import { Client } from '@microsoft/microsoft-graph-client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  // Try querying by connection ID first
  let response = await fetch(
    'https://' + hostname + '/api/v2/connection/conn_outlook_01KAVKKN8F6GY6N7XFEX4SWZ93?include_secrets=true',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json());

  console.log('[Outlook] Connection response (by ID):', JSON.stringify(response, null, 2));
  
  // If that didn't work, try querying by connector name
  if (!response.settings && !response.oauth) {
    response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json());
    
    console.log('[Outlook] Connection response (by name):', JSON.stringify(response, null, 2));
    connectionSettings = response.items?.[0];
  } else {
    connectionSettings = response;
  }
  
  if (!connectionSettings || (!connectionSettings.settings && !connectionSettings.oauth)) {
    console.log('[Outlook] Debug - hostname:', hostname);
    console.log('[Outlook] Debug - token exists:', !!xReplitToken);
    console.log('[Outlook] Debug - response keys:', Object.keys(response || {}));
    throw new Error('Outlook not connected - no connection found in response');
  }

  const accessToken = connectionSettings.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error('Outlook not connected - no access token found');
  }
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

  let request = client
    .api(`/me/mailFolders/${folderName}/messages`)
    .top(top)
    .skip(skip)
    .orderby(orderBy)
    .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,hasAttachments');

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
  
  const message = await client
    .api(`/me/messages/${messageId}`)
    .select('id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isRead,hasAttachments')
    .get();

  return message as OutlookMessage;
}

/**
 * Fetch all messages in a conversation thread
 */
export async function fetchConversationThread(conversationId: string): Promise<OutlookMessage[]> {
  const client = await getOutlookClient();
  
  const response = await client
    .api(`/me/messages`)
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
}): Promise<void> {
  const client = await getOutlookClient();

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

  await client.api('/me/sendMail').post({
    message,
    saveToSentItems: true,
  });
}

/**
 * Reply to an email
 */
export async function replyToEmail(messageId: string, comment: string): Promise<void> {
  const client = await getOutlookClient();

  await client.api(`/me/messages/${messageId}/reply`).post({
    comment,
  });
}

/**
 * Mark email as read/unread
 */
export async function markEmailAsRead(messageId: string, isRead: boolean = true): Promise<void> {
  const client = await getOutlookClient();

  await client.api(`/me/messages/${messageId}`).patch({
    isRead,
  });
}
