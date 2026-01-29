# Agent Instructions for Chat Heretics Monorepo

This is a monorepo containing three TypeScript/JavaScript projects:
- **Backend**: Bun + Express + MongoDB (Mongoose) + Socket.io + Clerk
- **Web**: React 19 + Vite + TypeScript
- **Mobile**: React Native + Expo Router + TypeScript

## Project Structure

```
backend/          - Express API server
  src/
    config/       - Database and configuration
    controllers/  - Route controllers
    middlewares/  - Express middleware
    models/       - Mongoose models (User, Chat, Message)
    routes/       - Express routes
    scripts/      - Utility scripts (seed.ts)
  index.ts        - Entry point
  utils/          - Utilities (socket.ts)

web/              - React web frontend
  src/
    App.tsx       - Main app component
    main.tsx      - Entry point
    assets/       - Static assets

mobile/chat/      - React Native mobile app
  app/            - Expo Router file-based routes
    (tabs)/       - Tab navigation group
    _layout.tsx   - Root layout
    modal.tsx     - Modal screen
  components/     - Reusable components
  hooks/          - Custom React hooks
  assets/         - Images and fonts
```

## Build/Lint Commands

### Backend (Bun)
```bash
cd backend
bun install          # Install dependencies
bun run dev          # Development with hot reload
bun run start        # Production start
bun run build        # Install deps (no actual build needed)
```

### Web (Vite + React)
```bash
cd web
npm install          # Install dependencies
npm run dev          # Development server (Vite)
npm run build        # Production build (tsc + vite build)
npm run lint         # ESLint check
npm run preview      # Preview production build
```

### Mobile (Expo)
```bash
cd mobile/chat
npm install          # Install dependencies
npm run start        # Start Expo dev server
npm run android      # Start for Android
npm run ios          # Start for iOS
npm run web          # Start for web
npm run lint         # Expo lint (eslint-config-expo)
npm run reset-project # Reset to fresh project state
```

## Code Style Guidelines

### TypeScript Configuration
- **Backend**: Uses Bun's strict tsconfig with `module: "Preserve"`, ESNext target
- **Web**: Vite-based, ES2022 target, strict mode enabled
- **Mobile**: Extends `expo/tsconfig.base`, strict mode enabled, path alias `@/*`

### Import Conventions
- Use ES modules (`"type": "module"` in all package.json files)
- Import order: external deps first, then internal modules
- Backend uses default imports for Express app
- Mobile uses `@/` path alias for project imports

Example:
```typescript
// Backend
import express from "express";
import cors from "cors";
import { connectDB } from "./src/config/database";

// Mobile
import { Image } from 'expo-image';
import { HelloWave } from '@/components/hello-wave';
```

### Naming Conventions
- **Files**: Use kebab-case for multi-word files (e.g., `user-controller.ts`, `error-handler.ts`)
- **Components**: PascalCase for React components (e.g., `App.tsx`, `HomeScreen`)
- **Models**: PascalCase for Mongoose models (e.g., `User.ts`, `Chat.ts`, `Message.ts`)
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for env vars and true constants

### Formatting
- Semicolons: Optional (backend code shows mixed usage, prefer explicit semicolons)
- Quotes: Double quotes for strings in backend, single quotes in mobile/web
- Indentation: 4 spaces in backend, 2 spaces in mobile/web
- Trailing commas: Not strictly enforced

### Error Handling
- Backend uses async/await with try-catch blocks
- Express error handler middleware at `src/middlewares/error-handler.ts`
- Always log errors with `console.error()` before handling
- Use process.exit(1) for fatal initialization errors

Example:
```typescript
try {
    await someAsyncOperation();
} catch (error) {
    console.error("Descriptive error message:", error);
    // Handle appropriately
}
```

### React Conventions
- Use functional components with hooks
- Prefer `function` keyword over arrow functions for components
- Destructure props in function parameters
- Mobile uses Expo Router with file-based routing

### Environment Variables
- Backend: Uses `dotenv/config` import at entry point
- Required vars: `PORT`, `MONGO_URI`, `FRONTEND_URL`, `NODE_ENV`
- Always validate required env vars with proper error messages

### Database (MongoDB/Mongoose)
- Models located in `backend/src/models/`
- Connection logic in `backend/src/config/database.ts`
- Use async/await for all DB operations
- Always handle connection errors gracefully

### Linting Rules
- **Web**: ESLint with @eslint/js, typescript-eslint, react-hooks, react-refresh
- **Mobile**: eslint-config-expo with flat config
- **Backend**: No ESLint configured (relies on TypeScript strict mode)

## Testing

No test framework is currently configured. To add tests:
- Backend: Consider `bun:test` or `vitest`
- Web: Add `vitest` or `jest` with React Testing Library
- Mobile: Use `@testing-library/react-native`

## Important Notes

1. **Bun Runtime**: Backend uses Bun (not Node.js). Use `bun` commands, not `npm`.
2. **Hot Reload**: Backend uses `bun --watch` for development.
3. **Mobile Path Aliases**: Mobile project uses `@/` alias mapped to root.
4. **Strict TypeScript**: All projects use strict mode with comprehensive type checking.
5. **Clerk Auth**: Backend uses @clerk/express for authentication middleware.
6. **Socket.io**: Real-time messaging support via `backend/utils/socket.ts`.
7. **CORS**: Backend configured for multiple origins (Expo, Vite dev, production).

## Running the Full Stack

1. Start MongoDB locally or ensure MONGO_URI is set
2. Start backend: `cd backend && bun run dev`
3. Start web: `cd web && npm run dev`
4. Start mobile: `cd mobile/chat && npm run start`
