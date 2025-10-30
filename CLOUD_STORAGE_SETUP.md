# Cloud Storage Import Setup Guide

Catalyst supports importing documents from Google Drive and OneDrive. To enable these features, you need to set up OAuth credentials.

## Google Drive Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Fill in required fields:
   - App name: Your app name
   - User support email: Your email
   - Developer contact: Your email
4. Add authorized domains: `lovableproject.com` (or your custom domain)
5. Add scopes:
   - `https://www.googleapis.com/auth/drive.readonly`

### 3. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `https://your-project-id.lovableproject.com`
   - `http://localhost:8080` (for local development)
5. Add authorized redirect URIs (not required for this implementation)
6. Click "Create"
7. Copy your **Client ID** and **API Key**

### 4. Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API key"
3. Copy the API key
4. (Optional) Restrict the key to Google Drive API

### 5. Add to Environment

Add these variables to your project:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
```

**For Lovable Projects:**
- Store these as publishable environment variables in your codebase
- These can be committed to your repository as they're meant to be public

---

## OneDrive Setup

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Fill in:
   - Name: Your app name
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Leave blank for now (OneDrive Picker uses a different flow)
5. Click "Register"

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add: `Files.Read`, `Files.Read.All`
6. Click "Add permissions"

### 3. Get Application ID

1. In your app's "Overview" page, copy the **Application (client) ID**

### 4. Add to Environment

Add this variable to your project:

```
VITE_ONEDRIVE_CLIENT_ID=your-application-id
```

**For Lovable Projects:**
- Store this as a publishable environment variable in your codebase
- This can be committed to your repository as it's meant to be public

---

## Testing

1. Open Catalyst
2. Click the import button
3. Select "Google Drive" or "OneDrive"
4. You should see the file picker
5. Select files to import

## Troubleshooting

### Google Drive Issues

- **"Error 403: access_denied"**: Check that your OAuth consent screen is configured correctly
- **"Invalid client"**: Verify your Client ID is correct and the domain is authorized
- **Picker doesn't appear**: Check browser console for CORS errors

### OneDrive Issues

- **Picker doesn't load**: Verify your Application ID is correct
- **"Access denied"**: Ensure API permissions are configured and admin consent is granted (if required)

## Security Notes

- These credentials are **publishable** (meant to be public)
- They only allow users to access their own files
- OAuth consent screen protects user data
- Users must explicitly grant permission to access their files
- Consider implementing additional server-side validation for production use
