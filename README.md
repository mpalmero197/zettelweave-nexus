# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4eb34d34-fd9d-491d-b4fe-83f99b554cfb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4eb34d34-fd9d-491d-b4fe-83f99b554cfb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4eb34d34-fd9d-491d-b4fe-83f99b554cfb) and click on Share -> Publish.

## Can I convert this project to PHP?

**No, this project cannot be converted to PHP.** Lovable projects are specifically built on React, Vite, Tailwind CSS, and TypeScript. Converting to PHP would require:

- Completely rewriting the entire frontend from React to PHP
- Breaking all existing interactive features and real-time functionality
- Losing the component-based architecture and modern UI features
- Starting over with a completely different technology stack

### Alternative Solutions

If you need server-side functionality similar to PHP, consider these options:

1. **Use Supabase Edge Functions** (already set up in this project)
   - JavaScript-based serverless functions
   - Can handle server-side logic, API integrations, and data processing
   - Examples already included: `transcribe-audio-ai`, `ai-edit-card`, `ai-reorganize-cards`

2. **Keep React frontend + External PHP API**
   - Maintain the existing React application
   - Create separate PHP services for backend needs
   - Connect them via REST API calls

3. **Use Lovable AI** (pre-configured)
   - AI-powered features without managing external APIs
   - Google Gemini and OpenAI GPT-5 models available
   - Perfect for chatbots, content generation, and intelligent features

The current React + Supabase architecture provides the same server-side capabilities as PHP while maintaining modern web features like real-time updates, responsive design, and interactive UI components.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
