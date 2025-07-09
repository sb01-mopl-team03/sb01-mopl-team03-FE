# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **모플 (MOPL)** - a Korean streaming platform frontend built with React, TypeScript, and Vite. The application provides a Netflix-like experience with features including user authentication, content browsing, live streaming rooms, playlists, and real-time chat functionality.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (runs on port 3000)
- `npm run build` - Build for production (requires TypeScript compilation)
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview production build

### Testing
There are no test scripts currently configured in package.json. Tests should be set up if needed.

## Architecture & Key Components

### Application Structure
- **Single Page Application (SPA)** using React Router-like navigation via state management
- **Component-based architecture** with reusable UI components
- **Mock data integration** with API integration points clearly marked for backend connection
- **State management** through React hooks and context (no external state management library)

### Core Application Flow
1. **Authentication Flow**: Login/Register → Dashboard/Content Pages
2. **Content Browsing**: Home → Category Pages → Content Detail → Watch Party
3. **Live Streaming**: Live Rooms → Join/Create Room → Watch Party with Chat
4. **Social Features**: Playlists, DM/Chat, Notifications, User Profiles

### Key Components

#### Main App Component (`src/App.tsx`)
- Central state management and routing logic
- All major UI state (currentPage, modals, user session)
- Event handlers for navigation and user interactions
- API integration points clearly marked with comments

#### UI Component Library (`src/components/ui/`)
- Complete shadcn/ui component library integration
- Radix UI primitives with custom styling
- Consistent design system implementation

#### Feature Components (`src/components/`)
- `Header.tsx` - Navigation and user actions
- `Dashboard.tsx` - Main content discovery page
- `WatchParty.tsx` - Video streaming with synchronized playback
- `LiveRooms.tsx` - Live streaming room management
- `ChatRoom.tsx` - Real-time messaging interface
- `ProfileModal.tsx` - User profile management

#### Custom Hooks (`src/hooks/`)
- `useWebSocket.ts` - WebSocket connection management with mock implementation

## Backend Integration

### API Integration Points
The codebase is structured for easy backend integration with clearly marked API integration points:

```typescript
// ========== API INTEGRATION POINT - START ==========
// TODO: Replace with actual API call
// Example: await loginUser(credentials)
// ========== API INTEGRATION POINT - END ==========
```

### Backend Configuration
- **Backend URL**: `http://localhost:8080` (Spring Boot)
- **API Proxy**: All `/api/*` requests are proxied to backend
- **WebSocket Proxy**: All `/ws/*` requests support WebSocket connections
- **Authentication**: JWT tokens stored in localStorage

### Mock Data Strategy
- All components use mock data with clear API integration markers
- Mock data simulates real backend responses
- WebSocket connections use mock implementation for development

## Technology Stack

### Core Technologies
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **Tailwind CSS** for styling with custom design system
- **shadcn/ui** component library
- **Radix UI** for accessible primitives

### Key Libraries
- **Form Management**: `react-hook-form` with `zod` validation
- **Date Handling**: `date-fns`
- **Charts**: `recharts` for data visualization
- **Animations**: `framer-motion`
- **Carousel**: `embla-carousel-react`
- **Icons**: `lucide-react`
- **Notifications**: `sonner`

## Styling & Design System

### Tailwind Configuration
- Custom color palette with CSS variables
- Design tokens for consistent theming
- Responsive design patterns
- Dark theme support with `next-themes`

### Component Styling Patterns
- Glass morphism effects (`glass-effect` class)
- Gradient text and backgrounds
- Consistent spacing and typography
- Accessibility-focused design

## Development Guidelines

### Code Organization
- Components are organized by feature and UI hierarchy
- Each component has clear props interfaces
- Mock data is separated and clearly marked
- API integration points are consistently documented

### State Management Patterns
- Local state with `useState` for component-specific data
- Props drilling for shared state (consider Context API for complex state)
- Event handlers passed down from main App component
- Clear separation between UI state and business logic

### WebSocket Implementation
- Mock WebSocket implementation in `useWebSocket.ts`
- STOMP protocol support (commented out for real implementation)
- Real-time chat and video synchronization features
- Participant management and room state

## Common Development Tasks

### Adding New Content Categories
1. Update `navItems` array in `Header.tsx`
2. Add new case in `renderCurrentPage()` switch statement in `App.tsx`
3. Create new category component following `CategoryPage.tsx` pattern

### Implementing Real API Integration
1. Replace mock data with actual API calls at marked integration points
2. Update authentication flow to use real JWT tokens
3. Implement proper error handling and loading states
4. Enable WebSocket connections by uncommenting real implementation

### Adding New Components
- Follow existing component patterns in `src/components/`
- Use TypeScript interfaces for props
- Implement proper accessibility features
- Include mock data for development

### Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Consistent spacing using Tailwind spacing scale
- Proper touch targets for mobile devices
- Responsive navigation patterns

## Path Configuration

The project uses path aliases configured in both `tsconfig.json` and `vite.config.ts`:
- `@/*` - Root directory
- `@/lib/*` - Library utilities
- `@/components/*` - React components
- `@/hooks/*` - Custom hooks
- `@/styles/*` - Style files

## Notes for Development

- The application is ready for backend integration with minimal changes
- All UI components are fully functional with mock data
- WebSocket implementation is ready for real-time features
- Authentication flow is implemented and ready for backend connection
- The design system is consistent and extensible