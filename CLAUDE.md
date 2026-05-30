# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

1. **Start Development Server**: `npm run dev`
   - Starts Next.js development server with hot reloading
   - Automatically watches for changes in `src/` directory

2. **Build Production Version**: `npm run build`
   - Compiles app for production
   - Optimizes assets and bundles code

3. **Run Linter**: `npm run lint`
   - Checks code against ESLint rules
   - Enforces code style and quality standards

4. **Run Tests**: `npm run test`
   - Executes Jest test suite
   - Includes unit and integration tests

5. **Run Single Test**: `npm run test -- --testNamePattern="<test-name>"`
   - Replace `<test-name>` with specific test file name
   - Example: `npm run test -- --testNamePattern="AIAssistantPage.test.tsx"`

## Code Architecture Overview

The codebase follows a typical Next.js/React architecture with:

1. **Pages Directory Structure** (`src/pages/`)
   - `Home.tsx`: Main landing page
   - `auth/`: Authentication flows (Login, Signup)
   - `dashboard/`: Protected routes with AI assistant functionality

2. **Components** (`src/components/`)
   - Reusable UI elements like modals, forms, and navigation components
   - Includes `GeminiChatWidget.tsx` for AI integration

3. **Hooks** (`src/hooks/`)
   - Custom hooks for state management and API calls
   - `useChatHistory.ts` manages conversation history for AI assistant

4. **Configuration**
   - `tsconfig.app.json`: TypeScript configuration for the app
   - `package.json`: Project dependencies and scripts

5. **Serverless Functions** (`netlify/functions/`)
   - `chat.ts`: Handles AI chat endpoint
   - Integrates with Gemini AI through `@google-cloud/vertex-ai` (assuming based on file name)

## File Structure Highlights

- `src/index.css`: Global styles for the application
- `src/pages/_app.tsx`: Next.js App component for layout and state management
- `src/pages/_document.tsx`: Custom document for Next.js
- `src/utils/`: Utility functions (not shown in current git status but common in such projects)

## Technology Stack

- React with TypeScript
- Next.js for server-side rendering
- Netlify for deployment
- Gemini AI integration (based on file names and structure)
- Tailwind CSS (implied by file structure and common practices)