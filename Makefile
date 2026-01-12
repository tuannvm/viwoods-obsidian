# Makefile for Viwoods Notes Importer Obsidian Plugin
# Based on tuannvm/codex-mcp-server Makefile structure

.PHONY: help dev build build-check lint format check test test-ui test-coverage test-watch clean install version typecheck ci release-check show-version status

# Default target
help:
	@echo "Viwoods Notes Importer - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev           - Start development build (watch mode)"
	@echo "  make build         - Production build"
	@echo "  make build-check   - Build with type checking"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          - Run ESLint"
	@echo "  make format        - Format code with ESLint --fix"
	@echo "  make typecheck     - Run TypeScript type check"
	@echo "  make check         - Run all checks (lint, typecheck, test)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run tests once"
	@echo "  make test-ui       - Run tests with UI"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make install       - Install dependencies"
	@echo "  make version       - Bump version (patch)"
	@echo ""
	@echo "CI/CD:"
	@echo "  make ci            - Run CI checks (lint, typecheck, test)"
	@echo "  make release-check - Verify ready for release"
	@echo "  make show-version  - Show current version"
	@echo "  make status        - Show git status"

# ============================================================================
# Development
# ============================================================================

dev:
	@echo "Starting development build (watch mode)..."
	@npm run dev

build:
	@echo "Building for production..."
	@npm run build
	@echo "Build complete: main.js"

build-check:
	@echo "Building with type checking..."
	@npm run build:check
	@echo "Build complete: main.js"

# ============================================================================
# Code Quality
# ============================================================================

lint:
	@echo "Running ESLint..."
	@npm run lint
	@echo "Running TypeScript type check..."
	@npx tsc --noEmit
	@echo "✓ Lint passed!"

format:
	@npm run format

typecheck:
	@echo "Running TypeScript type check..."
	@npx tsc --noEmit

check: lint typecheck build test
	@echo "✓ All checks passed!"

# ============================================================================
# Testing
# ============================================================================

test:
	@npm run test

test-ui:
	@npm run test:ui

test-coverage:
	@npm run test:coverage

test-watch:
	@npm run test:watch

# ============================================================================
# Maintenance
# ============================================================================

clean:
	@echo "Cleaning build artifacts..."
	@rm -f main.js
	@echo "Clean complete"

install:
	@echo "Installing dependencies..."
	@npm install

# Version management
version:
	@npm run version

# ============================================================================
# CI/CD Helpers
# ============================================================================

# Verify all checks pass (used by CI)
ci: lint typecheck test
	@echo "✓ CI checks passed!"

# ============================================================================
# Release Helpers
# ============================================================================

# Prepare for release (update changelog, verify everything works)
release-check: check
	@echo "✓ Ready for release!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Review changes: git diff"
	@echo "  2. Commit changes: git commit -am 'chore: prepare for release'"
	@echo "  3. Create release via GitHub Actions"

# Show current version
show-version:
	@echo "Current version:"
	@cat manifest.json | grep '"version"' | head -1

# Show git status
status:
	@echo "Git status:"
	@git status --short
