# Frontend Architecture

This document describes the frontend folder structure and component organization.

## Folder Structure

```
src/
├── components/
│   ├── bug/              # Bug-related components
│   │   ├── AIAnalysis.tsx       # Displays AI analysis results
│   │   ├── BugCard.tsx          # Wrapper card for bug display
│   │   ├── BugDetails.tsx       # Bug metadata and summary
│   │   └── BugList.tsx          # List of bug cards
│   ├── common/           # Reusable UI components
│   │   ├── EmptyState.tsx       # Empty state display
│   │   └── ErrorMessage.tsx     # Error message display
│   ├── layout/           # Layout components
│   │   ├── Header.tsx           # App header/navbar
│   │   └── Layout.tsx           # Main layout wrapper
│   └── search/           # Search-related components
│       └── SearchBar.tsx        # Search input with actions
├── hooks/                # Custom React hooks
│   └── useBugs.ts               # Bug data fetching and state management
├── services/             # External API services
│   └── api.ts                   # Backend API client
├── types/                # TypeScript type definitions
│   └── index.ts                 # Shared types
├── utils/                # Utility functions
│   └── formatters.ts            # Date and text formatters
├── App.tsx               # Root application component
├── main.tsx              # Application entry point
└── styles.css            # Global styles
```

## Component Hierarchy

```
App
└── Layout
    ├── Header
    └── Container
        ├── SearchBar
        ├── ErrorMessage (conditional)
        ├── EmptyState (conditional)
        └── BugList
            └── BugCard (multiple)
                ├── BugDetails
                └── AIAnalysis (conditional)
```

## Key Design Patterns

### 1. **Component Composition**
- Small, focused components with single responsibilities
- Composition over inheritance
- Props-based component communication

### 2. **Custom Hooks**
- `useBugs` hook encapsulates all bug-related state and logic
- Separates business logic from UI components
- Enables easy testing and reusability

### 3. **Separation of Concerns**
- **Components**: UI rendering only
- **Hooks**: State management and side effects
- **Services**: External API communication
- **Utils**: Pure utility functions
- **Types**: Type definitions and interfaces

### 4. **Feature-Based Organization**
- Components grouped by feature (`bug/`, `search/`, etc.)
- Makes it easy to find related files
- Scales well as the application grows

## Benefits

- **Maintainability**: Easy to locate and update specific functionality
- **Reusability**: Components can be reused across different parts of the app
- **Testability**: Isolated components and hooks are easier to test
- **Scalability**: Clear structure supports growing codebase
- **Collaboration**: Team members can work on different features without conflicts

## Best Practices

1. **Keep components small**: Each component should do one thing well
2. **Use TypeScript**: Strong typing prevents bugs and improves IDE support
3. **Props over state**: Pass data down through props when possible
4. **Extract logic to hooks**: Keep components focused on rendering
5. **Consistent naming**: Use descriptive names that reflect component purpose
