# Contributing to STL Shelf

Thanks for your interest in contributing! We welcome contributions from everyone.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/stl-shelf.git
   cd stl-shelf
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Start the development environment:
   ```bash
   docker compose up -d   # PostgreSQL + MinIO
   cp .env.example .env   # Configure environment
   bun db:migrate         # Run migrations
   bun dev                # Start dev server
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feat/add-model-search` - New features
- `fix/upload-timeout` - Bug fixes
- `docs/api-examples` - Documentation
- `chore/update-deps` - Maintenance

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **Formatting**: Run `bun format` before committing
- **Linting**: Run `bun lint` to check for issues
- **Types**: Run `bun check-types` to verify

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bulk download for models
fix: resolve file upload timeout on large files
docs: update API documentation
chore: update dependencies
```

### Before Submitting

1. Run the full check:
   ```bash
   bun check-types && bun check && bun test && bun build
   ```
2. Make sure all tests pass
3. Update documentation if needed

## Pull Requests

1. Create a PR against the `main` branch
2. Fill out the PR template
3. Link any related issues
4. Wait for review

### PR Guidelines

- Keep PRs focused and small when possible
- One feature/fix per PR
- Include tests for new functionality
- Update docs for user-facing changes

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Bun version, browser)
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Any implementation ideas (optional)

## Questions?

Open a [Discussion](https://github.com/CQ-Fabrication/stl-shelf/discussions) for questions or ideas.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
