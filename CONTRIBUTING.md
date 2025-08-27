# Contributing to Vault Secret Checker

This document provides information for developers who want to contribute to or work with the Vault Secret Checker project.

## Development Setup

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Docker (for containerized deployment)

### Getting Started

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` for development:

   ```env
   VAULT_ENDPOINTS=http://localhost:8200,https://vault.example.com
   APP_TITLE="Vault Secret Checker"
   ```

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`

## Project Structure

```text
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── config/        # Configuration endpoints
│   │   └── vault/         # Vault API proxies
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── ui/               # UI components
│   └── *.tsx             # Feature components
├── lib/                   # Utility libraries
└── helm-chart/           # Kubernetes deployment
```

## Available Scripts

- `npm run dev`: Development server
- `npm run build`: Production build
- `npm run start`: Production server
- `npm run lint`: ESLint

## API Endpoints

The application provides API endpoints that proxy Vault operations:

- `POST /api/vault/auth/approle/login`: AppRole authentication
- `POST /api/vault/auth/token/lookup-self`: Token lookup
- `POST /api/vault/auth/token/revoke-self`: Token revocation
- `POST /api/vault/sys/capabilities-self`: Permission validation
- `POST /api/vault/sys/wrapping/unwrap`: Token unwrapping
- `GET /api/config`: Application configuration

## Development Workflow

### Code Style

- Follow the existing code conventions
- Use TypeScript for type safety
- Run `npm run lint` before committing

### Architecture Overview

- **Frontend**: Next.js with React components
- **API Layer**: Next.js API routes that proxy Vault requests
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks and context

### Key Components

- `AuthenticationMethod.tsx`: Handles AppRole authentication
- `PermissionValidation.tsx`: Tests secret path permissions
- `WrappingTab.tsx`: Token wrapping/unwrapping functionality
- `EndpointList.tsx`: Vault endpoint selection

### Security Considerations

- Never store secrets in localStorage
- All Vault communications are proxied through API routes
- Input validation on all forms
- Proper error handling without exposing sensitive information

## Testing

Run tests with:

```bash
npm test
```

## Building for Production

```bash
npm run build
npm run start
```

## Docker Development

```bash
# Build local image
docker build -t vault-secret-checker .

# Run container
docker run -p 3000:3000 vault-secret-checker
```

## Contributing Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests and linting
5. Commit your changes with clear messages
6. Push to your fork
7. Submit a pull request

## Environment Variables

For development, create a `.env.local` file with:

```env
VAULT_ENDPOINTS=http://localhost:8200
APP_TITLE="Vault Secret Checker"
K8S_NAMESPACES=default,vault,kube-system
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASS=password
EMAIL_FROM=noreply@example.com
```

## Troubleshooting

### Common Issues

1. **Connection refused to Vault**: Ensure Vault is running and accessible
2. **Permission denied**: Check AppRole permissions and policies
3. **Build failures**: Clear `node_modules` and reinstall dependencies

### Debug Mode

Set `NODE_ENV=development` for additional logging.
