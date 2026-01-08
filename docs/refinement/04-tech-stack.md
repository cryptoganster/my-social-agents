# Document Processing - Tech Stack

## Core Technologies

### Runtime & Framework

- **Node.js** v20+ - Runtime environment
- **TypeScript** v5+ - Type-safe development
- **NestJS** v10+ - Application framework
- **Commander** - CLI framework

### Database & Persistence

- **PostgreSQL** v15+ - Primary database
- **TypeORM** v0.3+ - ORM for database access
- **Redis** v7+ - Caching layer (optional)

### Chunking & Text Processing

- **LangChain** v0.3+ - Text splitting and chunking
  - `RecursiveCharacterTextSplitter` - General text
  - `MarkdownTextSplitter` - Markdown content
  - `CodeTextSplitter` - Source code
- **tiktoken** - Token counting (OpenAI tokenizer)

### Entity Extraction

- **spaCy** (via Python bridge) - NER for general entities
- **Custom Regex Patterns** - Crypto-specific entities
- **OpenAI GPT-4o-mini** - LLM-based extraction (fallback)

### Temporal Analysis

- **chrono-node** - Natural language date parsing
- **date-fns** - Date manipulation and formatting

### Testing

- **Jest** - Unit and integration testing
- **fast-check** - Property-based testing
- **Supertest** - E2E testing for HTTP

### Logging & Monitoring

- **Winston** - Structured logging
- **Pino** - High-performance logging
- **OpenTelemetry** - Distributed tracing (optional)

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit checks

## Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/cqrs": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.0",
    "pg": "^8.11.0",
    "langchain": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "tiktoken": "^1.0.0",
    "chrono-node": "^2.7.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.0",
    "winston": "^3.11.0",
    "pino": "^8.16.0"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "fast-check": "^3.15.0",
    "supertest": "^6.3.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0"
  }
}
```

## Infrastructure Requirements

### Development Environment

- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 20GB+ free space
- **OS**: macOS, Linux, or Windows with WSL2

### Production Environment

- **CPU**: 8+ cores
- **RAM**: 16GB+ (32GB recommended)
- **Storage**: 100GB+ SSD
- **Database**: PostgreSQL 15+ with 50GB+ storage
- **Cache**: Redis 7+ with 4GB+ memory (optional)

### External Services

- **OpenAI API** (optional, for LLM-based extraction)
  - API Key required
  - Cost: ~$0.001 per 1K tokens
  - Rate limits: 10K requests/min

## Configuration

### Environment Variables

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=crypto_knowledge
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Processing Config
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CHUNKS_PER_DOCUMENT=100
ENABLE_LLM_EXTRACTION=false

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### NestJS Module Configuration

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      database: process.env.DATABASE_NAME,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      entities: [ProcessedDocumentEntity, ChunkEntity],
      synchronize: false,
      migrations: ['dist/migrations/*.js'],
    }),
    CqrsModule,
  ],
  providers: [
    // Domain Services
    SemanticChunker,
    CryptoEntityExtractor,
    TemporalAnalyzer,
    ContentQualityAnalyzer,

    // Infrastructure
    {
      provide: IChunkingStrategy,
      useClass: LangChainRecursiveChunker,
    },
    {
      provide: IEntityExtractor,
      useClass: HybridCryptoEntityExtractor,
    },

    // Repositories
    TypeOrmProcessedDocumentWriteRepository,
    ProcessedDocumentReadRepository,

    // Command Handlers
    ProcessDocumentHandler,
    ReprocessDocumentHandler,

    // Query Handlers
    GetProcessedDocumentHandler,
    GetChunksByDocumentHandler,

    // Event Handlers
    ContentIngestedEventHandler,
  ],
})
export class DocumentProcessingModule {}
```

## Performance Considerations

### Chunking Performance

- **RecursiveCharacterTextSplitter**: ~1000 docs/sec
- **MarkdownTextSplitter**: ~800 docs/sec
- **CodeTextSplitter**: ~600 docs/sec

### Entity Extraction Performance

- **Regex**: ~10,000 docs/sec
- **spaCy NER**: ~100 docs/sec
- **LLM (GPT-4o-mini)**: ~10 docs/sec (with batching)

### Database Performance

- **Write throughput**: ~1000 docs/sec
- **Read throughput**: ~5000 docs/sec
- **Index size**: ~100MB per 10K documents

### Memory Usage

- **Base**: ~200MB
- **Per document**: ~1-5MB (depending on size)
- **Peak**: ~2GB (with 100 concurrent documents)

## Scalability Strategy

### Horizontal Scaling

- Multiple worker processes
- Load balancing with Nginx
- Database read replicas

### Vertical Scaling

- Increase CPU cores for parallel processing
- Increase RAM for larger batches
- SSD for faster database access

### Caching Strategy

- Redis for frequently accessed documents
- In-memory cache for chunking strategies
- CDN for static assets (if HTTP API)

---

**Documento anterior**: [03-arquitectura.md](./03-arquitectura.md)
**Siguiente documento**: [05-responsabilidades.md](./05-responsabilidades.md)
