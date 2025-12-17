import { google } from 'googleapis';
import { Readable } from 'stream';

type UploadParams = {
  buffer: Buffer;
  name: string;
  mimeType?: string;
  folderId: string;
  driveId?: string;
  makePublic?: boolean;
};

type UploadResult = {
  fileId: string;
  webViewLink?: string | null;
  webContentLink?: string | null;
};

let driveClient: ReturnType<typeof google.drive> | null = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const oauthRedirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const oauth2 = new google.auth.OAuth2(oauthClientId, oauthClientSecret, oauthRedirectUri);
    oauth2.setCredentials({ refresh_token: oauthRefreshToken });
    driveClient = google.drive({ version: 'v3', auth: oauth2 });
    return driveClient;
  }

  const clientEmail = process.env.GDRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GDRIVE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing Google Drive credentials. Please set OAuth vars (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN) or GDRIVE_CLIENT_EMAIL and GDRIVE_PRIVATE_KEY.',
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}

export async function uploadFileToDrive({
  buffer,
  name,
  mimeType = 'application/octet-stream',
  folderId,
  driveId = process.env.GDRIVE_DRIVE_ID,
  makePublic = true,
}: UploadParams): Promise<UploadResult> {
  if (!folderId) {
    throw new Error('Missing GDRIVE_FOLDER_ID (target folder for CV uploads).');
  }

  const drive = getDriveClient();
  const fileMetadata = driveId ? { name, parents: [folderId], driveId } : { name, parents: [folderId] };
  const media = { mimeType, body: bufferToStream(buffer) as unknown as Readable };

  const created = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  const fileId = created.data.id;
  if (!fileId) {
    throw new Error('Drive upload failed to return a file ID.');
  }

  let webViewLink = created.data.webViewLink;
  let webContentLink = created.data.webContentLink;

  if (makePublic) {
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const updated = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    });
    webViewLink = updated.data.webViewLink ?? webViewLink;
    webContentLink = updated.data.webContentLink ?? webContentLink;
  }

  return { fileId, webViewLink, webContentLink };
}
