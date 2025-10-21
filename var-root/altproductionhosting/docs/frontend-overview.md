# Frontend Overview

The frontend is a Vite-powered React application. Routes are defined in [`src/routes/AppRoutes.tsx`](../frontend/src/routes/AppRoutes.tsx) and rendered from [`src/main.tsx`](../frontend/src/main.tsx).

## Key concepts

- **Navigation**: [`Navigation`](../frontend/src/components/Navigation.tsx) renders global links and a dev-mode toggle. Dev mode hides guided prompts for experienced users.
- **Dev assistant**: [`DevAssistant`](../frontend/src/components/DevAssistant.tsx) wraps content areas and displays contextual hints when dev mode is disabled.
- **Data hooks**:
  - Hosting data flows through [`useHostingSpaces`](../frontend/src/services/hostingHooks.ts) and [`useHostingSpaceDetail`](../frontend/src/services/hostingHooks.ts), which call the backend via [`apiClient`](../frontend/src/services/apiClient.ts).
  - Editor templates load through [`useEditorTemplates`](../frontend/src/services/editorHooks.ts).
- **Pages**: Dashboard, editor canvas, hosting file manager, and auth forms live inside [`src/pages`](../frontend/src/pages).
- **Styling**: Global styles are centralized in [`src/styles/global.css`](../frontend/src/styles/global.css) with CSS utility classes.

## Component map

| Area | Component | Description |
|------|-----------|-------------|
| Dashboard | [`DashboardPage`](../frontend/src/pages/DashboardPage.tsx) | Shows hosting spaces with links to editor and file manager. |
| Hosting detail | [`HostingSpacePage`](../frontend/src/pages/HostingSpacePage.tsx) | Lists uploaded files and storage usage. |
| Editor | [`EditorPage`](../frontend/src/pages/EditorPage.tsx) | Provides template selection and widget preview for drag-and-drop workflows. |
| Authentication | [`LoginPage`](../frontend/src/pages/LoginPage.tsx), [`RegisterPage`](../frontend/src/pages/RegisterPage.tsx) | Forms for account access and plan selection. |

Refer to the [Architecture](architecture.md) doc for how the frontend communicates with backend services.
