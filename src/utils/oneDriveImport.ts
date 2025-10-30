const ONEDRIVE_CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID || '';
const REDIRECT_URI = window.location.origin + '/auth/onedrive/callback';

interface OneDriveFile {
  name: string;
  '@microsoft.graph.downloadUrl': string;
  file?: {
    mimeType: string;
  };
}

export function openOneDrivePicker(onFileSelected: (file: { name: string; content: string }) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ONEDRIVE_CLIENT_ID) {
      reject(new Error('OneDrive credentials not configured. Please add VITE_ONEDRIVE_CLIENT_ID to your environment.'));
      return;
    }

    const options = {
      clientId: ONEDRIVE_CLIENT_ID,
      action: 'download',
      multiSelect: true,
      advanced: {
        filter: '.txt,.md,.docx,.pdf,.doc',
      },
      success: async (files: { value: OneDriveFile[] }) => {
        try {
          for (const file of files.value) {
            const content = await downloadOneDriveFile(file);
            onFileSelected({ name: file.name, content });
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      cancel: () => {
        resolve();
      },
      error: (error: Error) => {
        reject(error);
      },
    };

    // Load OneDrive Picker SDK
    loadOneDrivePickerSDK().then(() => {
      (window as any).OneDrive.open(options);
    }).catch(reject);
  });
}

function loadOneDrivePickerSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).OneDrive) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.live.net/v7.2/OneDrive.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load OneDrive SDK'));
    document.head.appendChild(script);
  });
}

async function downloadOneDriveFile(file: OneDriveFile): Promise<string> {
  const downloadUrl = file['@microsoft.graph.downloadUrl'];
  
  if (!downloadUrl) {
    throw new Error('No download URL available for file');
  }

  const response = await fetch(downloadUrl);
  
  if (!response.ok) {
    throw new Error('Failed to download file from OneDrive');
  }

  // Check if it's a binary file that needs conversion
  const mimeType = file.file?.mimeType || '';
  
  if (mimeType.includes('officedocument') || mimeType.includes('pdf')) {
    // For Office docs and PDFs, return a message that they need server-side processing
    const blob = await response.blob();
    return `[File "${file.name}" downloaded - Binary content requires conversion]`;
  }
  
  return await response.text();
}
