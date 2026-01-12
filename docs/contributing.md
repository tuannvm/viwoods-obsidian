# Contributing

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/viwoods-obsidian.git`
3. Install dependencies: `npm install`

**Upstream repository:** `https://github.com/tuannvm/viwoods-obsidian.git`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Workflow

```bash
# Watch for changes during development
npm run dev

# Run linter
npx eslint main.ts

# Production build
npm run build
```

## Code Style

- Use TypeScript strict mode
- Follow existing code conventions
- Keep functions focused and single-purpose
- Use descriptive variable and function names
- Add comments for non-obvious logic

## Pull Requests

1. Ensure your code passes the build: `npm run build`
2. Update documentation if needed
3. Write a clear commit message following [conventional commits](https://www.conventionalcommits.org/)
4. Push to your fork and submit a PR

## Commit Convention

Follow conventional commits for automated versioning:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `refactor:`, `docs:`, `test:`, `chore:` - No version bump

## Testing

- Test manually with Viwoods `.note` files
- Verify on desktop and mobile if applicable
- Check settings persistence
- Ensure cleanup works (reload/unload plugin)

## Reporting Issues

Include:
- Obsidian version
- Plugin version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Sample file (if possible, redact sensitive data)
