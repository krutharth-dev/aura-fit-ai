# Contributing to AURA FIT AI

Thank you for helping improve AURA FIT AI. Contributions to the interface, agent workflow, workout logic, accessibility, testing, documentation, and deployment tooling are welcome.

## Before You Start

- Search existing issues and pull requests to avoid duplicate work.
- Open an issue before a substantial feature, architecture, database, or user-experience change.
- Report vulnerabilities privately according to the security policy.
- Use Node.js 22.13 or later, as specified by the project.

## Development Workflow

1. Fork the repository and create a focused branch from `main`.
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Make one logically related change at a time.
4. Run the relevant validation commands:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```
   For changes spanning the full application and Python agent, run `npm run test:all`.
5. Update documentation, environment examples, migrations, and tests where relevant.
6. Open a pull request and complete the checklist.

## Project Guidelines

- Never commit API keys, tokens, credentials, personal health data, or local environment files.
- Keep AI-generated fitness guidance transparent, cautious, and within the product's stated scope.
- Do not present generated guidance as diagnosis, emergency care, or a replacement for a qualified professional.
- Preserve accessibility, responsive behaviour, and clear error states.
- Validate user-controlled input at appropriate trust boundaries.
- Keep database schema and migrations consistent.
- Avoid committing generated build artefacts unless the repository explicitly tracks them.

## Pull Request Checklist

- `npm run lint`, `npm run typecheck`, and relevant tests pass.
- User-visible changes include suitable documentation or screenshots.
- New environment variables are documented in `.env.example`.
- Database changes include the required migration.
- No secrets or personal data are included.
- The change follows the Code of Conduct.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
