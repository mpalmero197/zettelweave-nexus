const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let tokenClient: any = null;
let accessToken: string | null = null;
let pickerInited = false;
let gisInited = false;

export function initGoogleDrive(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
      reject(new Error('Google Drive credentials not configured. Please add VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY to your environment.'));
      return;
    }

    // Load the Google API script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('client:picker', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: GOOGLE_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          pickerInited = true;
          checkAndResolve();
        } catch (error) {
          reject(error);
        }
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google API'));
    document.head.appendChild(script);

    // Load GIS script
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      });
      gisInited = true;
      checkAndResolve();
    };
    gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(gisScript);

    function checkAndResolve() {
      if (pickerInited && gisInited) {
        resolve();
      }
    }
  });
}

export function openGoogleDrivePicker(onFileSelected: (file: { name: string; content: string }) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Drive not initialized'));
      return;
    }

    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        reject(new Error(response.error));
        return;
      }
      accessToken = response.access_token;
      createPicker(onFileSelected, resolve, reject);
    };

    if (accessToken === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      createPicker(onFileSelected, resolve, reject);
    }
  });
}

function createPicker(
  onFileSelected: (file: { name: string; content: string }) => void,
  resolve: () => void,
  reject: (error: Error) => void
) {
  const google = (window as any).google;
  
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setMimeTypes('text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/msword');

  const picker = new google.picker.PickerBuilder()
    .enableFeature(google.picker.Feature.NAV_HIDDEN)
    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .setDeveloperKey(GOOGLE_API_KEY)
    .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
    .setOAuthToken(accessToken!)
    .addView(view)
    .setCallback(async (data: any) => {
      if (data.action === google.picker.Action.PICKED) {
        try {
          for (const doc of data.docs) {
            const fileContent = await downloadFile(doc.id);
            onFileSelected({ name: doc.name, content: fileContent });
          }
          resolve();
        } catch (error) {
          reject(error as Error);
        }
      } else if (data.action === google.picker.Action.CANCEL) {
        resolve();
      }
    })
    .build();

  picker.setVisible(true);
}

async function downloadFile(fileId: string): Promise<string> {
  const gapi = (window as any).gapi;
  
  try {
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.body;
  } catch (error) {
    // Fallback: try to export if it's a Google Doc
    try {
      const exportResponse = await gapi.client.drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain',
      });
      return exportResponse.body;
    } catch (exportError) {
      throw new Error('Failed to download file from Google Drive');
    }
  }
}
