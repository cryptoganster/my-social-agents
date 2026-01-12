---
inclusion: fileMatch
fileMatchPattern: 
  - "**/steering/**/*.md"
---

# Steering Files Guide

This directory contains steering files that provide contextual guidance to Kiro AI during development. Steering files help maintain architectural consistency, coding standards, and best practices across the codebase.

## What are Steering Files?

Steering files are markdown documents that:
- Provide architectural guidance and design patterns
- Document coding conventions and best practices
- Offer context-specific help when working on particular file types
- Ensure consistency across the codebase
- Help onboard new developers and AI assistants

## How Steering Files Work

Steering files use **inclusion modes** to determine when they are loaded into context:

### Inclusion Modes

1. **`always`** - Loaded for every interaction
   - Use for: Core principles, fundamental concepts, universal guidelines
   - Example: Clean Architecture, SOLID principles, naming conventions

2. **`fileMatch`** - Loaded only when working with matching files
   - Use for: Technology-specific guidance, layer-specific patterns
   - Example: Aggregate patterns when editing aggregate files
   - Configured with glob patterns in frontmatter

3. **`manual`** - Loaded only when explicitly requested
   - Use for: Reference material, optional documentation
   - Example: Technology stack reference
   - Access via `#` context key in chat

## All Steering Files

### Product & Business Context

#### 01-product-overview.md
- **Inclusion**: `always`
- **Purpose**: Product vision, core capabilities, and scope
- **Contains**: Business domain overview, key characteristics, what's out of scope
- **When to reference**: Understanding business context and product goals

#### 02-bounded-contexts.md
- **Inclusion**: `always`
- **Purpose**: DDD bounded contexts and their responsibilities
- **Contains**: 7 bounded contexts, implementation status, context boundaries
- **When to reference**: Understanding system organization and context boundaries

### Core Architecture Principles

#### 10-clean-architecture.md
- **Inclusion**: `always`
- **Purpose**: 4-layer architecture and SOLID principles
- **Contains**: Domain/App/Infra/API layers, dependency rules, SOLID principles
- **When to reference**: Making architectural decisions, understanding layer responsibilities

#### 11-ddd-fundamentals.md
- **Inclusion**: `always`
- **Purpose**: Domain-Driven Design core concepts
- **Contains**: Bounded contexts, ubiquitous language, domain purity, aggregates/entities/VOs
- **When to reference**: Designing domain models, maintaining domain purity

#### 12-cqrs-patterns.md
- **Inclusion**: `always`
- **Purpose**: Command Query Responsibility Segregation patterns
- **Contains**: Write/read separation, repository patterns, factories, read models
- **When to reference**: Implementing commands/queries, designing repositories

#### 13-dependency-injection.md
- **Inclusion**: `manual`
- **Purpose**: Index to dependency injection guidance files
- **Contains**: Links to focused DI files with specific inclusion modes
- **When to reference**: Looking for DI guidance overview

#### 13-dependency-injection-core.md
- **Inclusion**: `always`
- **Purpose**: Core DI principles and Dependency Inversion Principle
- **Contains**: DI fundamentals, DIP, constructor injection, depend on abstractions
- **When to reference**: Understanding DI fundamentals

#### 13a-injectable-decorator.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/infra/**/*.ts`, `**/app/**/*.ts`, `**/domain/services/**/*.ts`
- **Purpose**: When to use @Injectable() decorator
- **Contains**: DO use on services, DON'T use on domain objects, decision guide
- **When to reference**: Working on infrastructure, application, or domain services

#### 13b-handler-dependencies.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/app/commands/**/*.ts`, `**/app/queries/**/*.ts`, `**/app/events/**/*.ts`
- **Purpose**: Handler dependency patterns (CRITICAL: depend on interfaces)
- **Contains**: Command/query/event handler patterns, @Inject() usage, testing handlers
- **When to reference**: Working on command/query/event handlers

#### 13c-module-configuration.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/*.module.ts`
- **Purpose**: NestJS module configuration for DI
- **Contains**: Provider registration, string tokens, useClass/useFactory/useValue, exports
- **When to reference**: Configuring NestJS modules

#### 13d-testing-with-di.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/*.spec.ts`, `**/__tests__/**/*.ts`
- **Purpose**: Testing with dependency injection
- **Contains**: Unit testing with mocks, integration testing, mock helpers, best practices
- **When to reference**: Writing tests for services that use DI

#### 14-event-driven-architecture.md
- **Inclusion**: `always`
- **Purpose**: Event-driven architecture for cross-context communication
- **Contains**: Bounded context isolation, domain events, event handlers, sagas, anti-patterns
- **When to reference**: Implementing cross-context communication, avoiding direct dependencies between contexts

#### 15-dto-patterns.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/api/**/dto/**/*.ts`, `**/api/**/dtos/**/*.ts`, `**/api/http/dto/**/*.ts`, `**/api/graphql/types/**/*.ts`
- **Purpose**: DTO patterns for safe data transport across boundaries
- **Contains**: Input/output DTOs, over-posting protection, DTO vs Read Model distinction, mapper patterns
- **When to reference**: Working on API DTOs, request/response objects, data transport

#### 16-read-models.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/app/queries/**/read-model.ts`, `**/app/queries/**/handler.ts`
- **Purpose**: Read Model patterns for CQRS query side
- **Contains**: Read Model structure, query folder organization, denormalization, class suffixes
- **When to reference**: Working on query handlers, read models, CQRS read side

### Domain Layer Guidance

#### 20-aggregates.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/domain/aggregates/**/*.ts`
- **Purpose**: Aggregate root implementation with optimistic locking
- **Contains**: AggregateRoot base class, version control, factory patterns, concurrency handling
- **When to reference**: Creating or modifying aggregates

#### 21-value-objects.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/domain/value-objects/**/*.ts`
- **Purpose**: Value object implementation patterns
- **Contains**: ValueObject base class, immutability, validation, equality
- **When to reference**: Creating or modifying value objects

#### 22-domain-services.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/domain/services/**/*.ts`
- **Purpose**: Domain service patterns and when to use them
- **Contains**: When to use domain services, keeping VOs pure, stateless patterns
- **When to reference**: Implementing domain logic that doesn't belong to entities/VOs

#### 23-domain-events.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/domain/events/**/*.ts`, `**/app/events/**/*.ts`
- **Purpose**: Domain event patterns and handlers
- **Contains**: Event definition, @EventsHandler pattern, cross-context communication
- **When to reference**: Creating domain events or event handlers

### Infrastructure Layer Guidance

#### 30-repositories.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/repositories/**/*.ts`
- **Purpose**: Repository implementation patterns for aggregates
- **Contains**: Write/read repositories, TypeORM patterns, CRITICAL DDD principle (repositories ONLY for aggregates)
- **When to reference**: Implementing repositories, understanding aggregate persistence

#### 31-factories.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/factories/**/*.ts`
- **Purpose**: Factory patterns for aggregate reconstitution
- **Contains**: Loading aggregates from persistence, reconstitute vs create patterns
- **When to reference**: Implementing factories, loading aggregates from database

#### 32-adapters-external.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/adapters/**/*.ts`, `**/external/**/*.ts`
- **Purpose**: Adapter patterns for external services
- **Contains**: Adapter pattern, interface definition, pluggable infrastructure
- **When to reference**: Integrating external services or APIs

#### 32-nestjs-modules.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/*.module.ts`
- **Purpose**: NestJS module organization and CQRS setup
- **Contains**: @Module configuration, CQRS decorators, provider patterns, HTTP exceptions
- **When to reference**: Configuring NestJS modules or CQRS handlers

#### 33-api-controllers.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/api/**/*.ts`, `**/controllers/**/*.ts`
- **Purpose**: API controller patterns and best practices
- **Contains**: Controller responsibilities, CommandBus/QueryBus usage, error handling, DTOs
- **When to reference**: Implementing REST controllers or CLI commands

#### 34-read-repository-interfaces.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/app/interfaces/repositories/**/*-read.ts`, `**/api/**/*.ts`, `**/factories/**/*.ts`
- **Purpose**: Read repository interface pattern for Clean Architecture
- **Contains**: Interface definition in Application layer, DIP implementation, module registration, injection patterns
- **When to reference**: Creating read repositories, updating API controllers or factories

### Implementation Standards

#### 40-naming-conventions.md
- **Inclusion**: `always`
- **Purpose**: File, interface, and class naming conventions
- **Contains**: No suffixes rule, `I` prefix for interfaces, implementation naming
- **When to reference**: Naming any file, class, or interface

#### 41-testing-patterns.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/*.spec.ts`, `**/__tests__/**/*.ts`
- **Purpose**: Unit and property-based testing patterns
- **Contains**: Jest patterns, fast-check usage, property test format
- **When to reference**: Writing or modifying tests

#### 42-logging-patterns.md
- **Inclusion**: `fileMatch`
- **Pattern**: `**/infra/**/*.ts`, `**/app/**/*.ts`
- **Purpose**: Logging with NestJS Logger and Pino
- **Contains**: Logger instantiation, log levels, structured logging, Pino integration
- **When to reference**: Adding logging to services or handlers

### Technology & Tools

#### 50-technology-stack.md
- **Inclusion**: `manual`
- **Purpose**: Technology stack reference and commands
- **Contains**: Core technologies, infrastructure options, CLI commands
- **When to reference**: Looking up technologies, commands, or tooling

#### 51-typescript-configuration.md
- **Inclusion**: `always`
- **Purpose**: TypeScript path aliases and configuration
- **Contains**: Path alias naming convention, configuration requirements, import patterns
- **When to reference**: Adding new bounded contexts, configuring imports, troubleshooting module resolution

#### 60-git-workflow.md
- **Inclusion**: `always`
- **Purpose**: Rebase-based Git workflow with critical rules
- **Contains**: Rebase strategy, workflow steps, examples, best practices, forbidden commands
- **When to reference**: Daily Git operations, creating PRs, understanding rebase workflow

#### 61-git-hooks.md
- **Inclusion**: `always`
- **Purpose**: Git hooks enforcement mechanisms
- **Contains**: All 8 hooks explained, blocked commands, testing procedures, enforcement level
- **When to reference**: Understanding hook behavior, troubleshooting hook failures

#### 62-git-troubleshooting.md
- **Inclusion**: `manual`
- **Purpose**: Git troubleshooting and migration guide
- **Contains**: Common issues, migration steps, FAQ, workflow comparison, safe aliases
- **When to reference**: Resolving Git issues, migrating to rebase workflow, learning safe aliases

#### 63-github-workflows-comparison.md
- **Inclusion**: `always`
- **Purpose**: GitHub Actions workflows comparison and adoption recommendations
- **Contains**: Detailed comparison between bookings-bot and my-social-agents workflows, implementation priorities, Phase 1-3 plan
- **When to reference**: Understanding CI/CD capabilities, planning workflow improvements, implementing new GitHub Actions

## FileMatch Patterns Explained

FileMatch patterns use glob syntax to match file paths:

### Basic Patterns

- `*.ts` - Matches TypeScript files in current directory only
- `**/*.ts` - Matches TypeScript files in any directory (recursive)
- `**/domain/**/*.ts` - Matches TypeScript files in any `domain` directory
- `**/*.spec.ts` - Matches test files anywhere

### Multiple Patterns

Some files use multiple patterns separated by commas:

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/repositories/**/*.ts, **/factories/**/*.ts"
---
```

This matches files in EITHER `repositories/` OR `factories/` directories.

### Pattern Examples

| Pattern | Matches | Example Files |
|---------|---------|---------------|
| `**/domain/aggregates/**/*.ts` | Aggregate files | `src/ingestion/domain/aggregates/ingestion-job.ts` |
| `**/domain/value-objects/**/*.ts` | Value object files | `src/ingestion/domain/value-objects/content-hash.ts` |
| `**/*.module.ts` | NestJS module files | `src/ingestion/content/ingestion-content.module.ts` |
| `**/*.spec.ts` | Test files | `src/shared/kernel/__tests__/value-object.spec.ts` |

## Manual Inclusion

To manually include a steering file in your context, use the `#` symbol in chat:

```
# In Kiro chat
Can you help me understand the technology stack? #50-technology-stack
```

This loads the specified steering file for that conversation.

## File Reference Syntax

Steering files can reference other files or sections using the syntax:

```markdown
#[[file:relative-path.md]]
#[[file:relative-path.md#section-name]]
```

### Examples

Reference entire file:
```markdown
For SOLID principles, see #[[file:10-clean-architecture.md]]
```

Reference specific section:
```markdown
For dependency rules, see #[[file:10-clean-architecture.md#dependency-rules]]
```

### Benefits

- Avoids content duplication
- Creates single source of truth
- Maintains consistency across files
- Easier to update guidance

## Frontmatter Format

Each steering file includes frontmatter to configure its inclusion mode:

### Always Inclusion

```yaml
---
inclusion: always
---
```

### FileMatch Inclusion

```yaml
---
inclusion: fileMatch
fileMatchPattern: "**/domain/aggregates/**/*.ts"
---
```

### Manual Inclusion

```yaml
---
inclusion: manual
---
```

## Best Practices

### For Developers

1. **Read relevant steering files** before starting work in a new area
2. **Follow the patterns** documented in steering files
3. **Update steering files** when patterns evolve
4. **Reference steering files** in code reviews
5. **Use manual inclusion** for reference material

### For AI Assistants

1. **Respect inclusion modes** - don't load manual files automatically
2. **Apply guidance consistently** across all code
3. **Reference steering files** when explaining decisions
4. **Suggest updates** when patterns change
5. **Use file references** to avoid duplication

### For Maintainers

1. **Keep files focused** - one responsibility per file
2. **Update patterns** as the codebase evolves
3. **Test fileMatch patterns** against actual files
4. **Document changes** in migration guides
5. **Review regularly** for accuracy and relevance

## File Organization

Files are numbered by category for easy navigation:

- **01-09**: Product & Business Context
- **10-19**: Core Architecture Principles
- **20-29**: Domain Layer Guidance
- **30-39**: Infrastructure Layer Guidance
- **40-49**: Implementation Standards
- **50-59**: Technology & Tools

## Getting Help

### I'm working on an aggregate
→ File `20-aggregates.md` will load automatically

### I'm writing tests
→ File `41-testing-patterns.md` will load automatically

### I need to understand CQRS
→ File `12-cqrs-patterns.md` is always loaded

### I want to see available technologies
→ Use `#50-technology-stack` in chat

### I'm not sure which layer code belongs in
→ File `10-clean-architecture.md` is always loaded

## Migration from Old Files

If you're looking for content from deprecated files:

- `aggregate-root-guide.md` → `20-aggregates.md`
- `value-objects.md` → `21-value-objects.md`
- `cqrs-architecture.md` → `12-cqrs-patterns.md`, `30-repositories-factories.md`
- `ddd-naming-conventions.md` → `40-naming-conventions.md`, `22-domain-services.md`, `13-dependency-injection.md`
- `rules.md` + `SOLID.md` → `10-clean-architecture.md`, `11-ddd-fundamentals.md`
- `structure.md` → `02-bounded-contexts.md`, `10-clean-architecture.md`
- `product.md` → `01-product-overview.md`
- `tech.md` → `50-technology-stack.md`

See `MIGRATION.md` for detailed mapping.

## Summary

- **21 steering files** organized by category
- **3 inclusion modes**: always, fileMatch, manual
- **FileMatch patterns** load guidance when working on specific file types
- **File references** avoid duplication and maintain consistency
- **Numbered organization** makes files easy to find
- **Context-aware loading** provides relevant guidance without clutter

For questions or suggestions about steering files, please discuss with the team or update this README.
