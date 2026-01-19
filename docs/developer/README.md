# FleetifyApp Developer Documentation

## Overview
Welcome to the FleetifyApp developer documentation. This section provides comprehensive resources for developers working with or contributing to the FleetifyApp platform.

## 🚀 Quick Links
- **[Setup Guide](./SETUP.md)** - Get your development environment running
- **[API Reference](../api/README.md)** - Interactive API documentation
- **[Architecture Overview](./ARCHITECTURE.md)** - System architecture and design
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to FleetifyApp

## 📚 Development Resources

### Getting Started
- **[Prerequisites](./SETUP.md#prerequisites)** - Required tools and software
- **[Environment Setup](./SETUP.md#environment-setup)** - Development environment configuration
- **[Installation Guide](./SETUP.md#installation)** - Step-by-step installation
- **[First Run](./SETUP.md#first-run)** - Running the application locally

### Code Architecture
- **[System Architecture](./ARCHITECTURE.md)** - High-level system design
- **[Frontend Architecture](./FRONTEND.md)** - React frontend structure
- **[Backend Architecture](./BACKEND.md)** - Supabase backend architecture
- **[Database Schema](./DATABASE.md)** - Complete database documentation

### Development Workflows
- **[Development Workflow](./WORKFLOW.md)** - Day-to-day development process
- **[Testing Strategy](./TESTING.md)** - Testing approaches and guidelines
- **[Debugging Guide](./DEBUGGING.md)** - Debugging techniques and tools
- **[Performance Optimization](./PERFORMANCE.md)** - Performance best practices

### API Development
- **[REST API Guide](../api/REST_API.md)** - RESTful API development
- **[Database Functions](../api/DATABASE_FUNCTIONS.md)** - Database RPC functions
- **[Real-time Features](../api/REALTIME.md)** - WebSocket and real-time features
- **[Authentication & Security](../api/SECURITY.md)** - API security implementation

### Frontend Development
- **[React Components](./frontend/COMPONENTS.md)** - Component architecture and patterns
- **[State Management](./frontend/STATE_MANAGEMENT.md)** - React Query and Context
- **[Styling Guidelines](./frontend/STYLING.md)** - TailwindCSS and component styling
- **[Mobile Development](./frontend/MOBILE.md)** - Capacitor mobile app development

### Database Development
- **[Database Design](./database/DESIGN.md)** - Database design principles
- **[Migrations Guide](./database/MIGRATIONS.md)** - Database migration management
- **[Row Level Security](./database/RLS.md)** - Security policies and RLS
- **[Performance Tuning](./database/PERFORMANCE.md)** - Database optimization

## 🛠️ Development Tools

### Required Tools
- **Node.js** (v18+) - JavaScript runtime
- **npm** or **pnpm** - Package manager
- **Git** - Version control
- **VS Code** - Recommended IDE with extensions
- **PostgreSQL** - Database (local development)
- **Supabase CLI** - Local Supabase development

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Development Scripts
```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Database
npm run db:reset         # Reset local database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database with sample data

# Mobile Development
npm run build:mobile     # Build for mobile
npm run android:run      # Run on Android
npm run ios:run          # Run on iOS
```

## 🏗️ Project Structure

### Directory Overview
```
fleetifyapp/
├── src/                          # Source code
│   ├── components/               # Reusable React components
│   │   ├── ui/                  # Base UI components (shadcn)
│   │   ├── forms/               # Form components
│   │   └── layout/              # Layout components
│   ├── pages/                   # Page components (routes)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   ├── utils/                   # Helper functions
│   ├── types/                   # TypeScript type definitions
│   ├── contexts/                # React Context providers
│   ├── services/                # External service integrations
│   └── migrations/              # Database migrations
├── docs/                        # Documentation
├── public/                      # Static assets
├── tests/                       # Test files
├── scripts/                     # Build and utility scripts
└── .github/                     # GitHub workflows
```

### Key Configuration Files
- `package.json` - Project dependencies and scripts
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - TailwindCSS configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `capacitor.config.ts` - Mobile app configuration

## 🔧 Development Guidelines

### Code Standards
- **TypeScript**: All code must be written in TypeScript
- **ESLint**: Follow configured linting rules
- **Prettier**: Use Prettier for code formatting
- **Conventional Commits**: Use conventional commit messages
- **File Naming**: Follow the established naming conventions

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/description-of-feature

# Make changes
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/description-of-feature
```

### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Create pull request with detailed description
5. Request code review
6. Address feedback
7. Merge to main after approval

## 🧪 Testing

### Test Structure
```
src/
├── __tests__/                   # Test files
│   ├── components/             # Component tests
│   ├── hooks/                  # Hook tests
│   ├── utils/                  # Utility tests
│   └── integration/            # Integration tests
└── test-utils/                 # Test utilities and mocks
```

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test VehicleManagement.test.tsx
```

### Testing Guidelines
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Coverage**: Maintain 80%+ test coverage
- **Mock Data**: Use consistent mock data across tests

## 🚀 Deployment

### Development Deployment
```bash
# Build development version
npm run build:dev

# Deploy to staging
npm run deploy:staging
```

### Production Deployment
```bash
# Build production version
npm run build

# Deploy to production
npm run deploy:production
```

### Mobile App Deployment
```bash
# Build Android APK
npm run android:build

# Build iOS IPA
npm run ios:build
```

## 🔍 Debugging

### Browser DevTools
- **Console**: Check for JavaScript errors
- **Network**: Monitor API requests and responses
- **Elements**: Inspect HTML and CSS
- **React DevTools**: Debug React components and state

### Debugging Tools
- **React Query DevTools**: Debug server state
- **Supabase Dashboard**: Debug database operations
- **Vite DevTools**: Debug build process
- **Lighthouse**: Performance debugging

## 📈 Performance

### Performance Metrics
- **Bundle Size**: Monitor and optimize JavaScript bundle
- **Load Time**: Track page load performance
- **API Response**: Optimize API response times
- **Database Queries**: Optimize database performance

### Optimization Techniques
- **Code Splitting**: Lazy load components and routes
- **Image Optimization**: Optimize image sizes and formats
- **Caching**: Implement appropriate caching strategies
- **Database Indexing**: Optimize database queries

## 🔒 Security

### Security Best Practices
- **Input Validation**: Validate all user inputs
- **Authentication**: Implement secure authentication
- **Authorization**: Enforce proper access controls
- **Data Encryption**: Encrypt sensitive data
- **Audit Logging**: Log security-relevant events

### Security Tools
- **ESLint Security Rules**: Static code analysis
- **Dependency Audit**: Check for vulnerable dependencies
- **Environment Variables**: Secure configuration management
- **HTTPS**: Enforce secure connections

## 🌐 Internationalization

### Language Support
- **English**: Default language (en)
- **Arabic**: Right-to-left support (ar)
- **i18n Framework**: Built-in internationalization

### Adding New Languages
1. Create language file in `src/locales/`
2. Add translations for all text strings
3. Update language switcher component
4. Test RTL/LTR layout switching

## 📚 Additional Resources

### Documentation
- **[React Documentation](https://react.dev)** - Official React docs
- **[Supabase Documentation](https://supabase.com/docs)** - Database and backend
- **[TailwindCSS Documentation](https://tailwindcss.com/docs)** - CSS framework
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - TypeScript guide

### Community
- **[GitHub Repository](https://github.com/fleetifyapp/fleetifyapp)** - Source code
- **[Issues](https://github.com/fleetifyapp/fleetifyapp/issues)** - Bug reports and features
- **[Discussions](https://github.com/fleetifyapp/fleetifyapp/discussions)** - Community discussions
- **[Discord Server](https://discord.gg/fleetifyapp)** - Real-time chat

---

**Next Step**: Follow the [Setup Guide](./SETUP.md) to get your development environment configured and start contributing to FleetifyApp!