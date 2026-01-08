# Document Processing - Guía Completa Consolidada

## Resumen Ejecutivo

Este documento consolida toda la información esencial del bounded context **Document Processing**. Para detalles específicos, consulta los documentos individuales en esta carpeta.

---

## 1. Bounded Context: document-processing

### Límites del Contexto

**Dentro del Alcance**:

- ✅ Chunking semántico de contenido
- ✅ Extracción de entidades crypto
- ✅ Análisis temporal
- ✅ Scoring de calidad
- ✅ Generación de metadata
- ✅ Versionado de documentos

**Fuera del Alcance**:

- ❌ Ingesta de contenido (Content Ingestion)
- ❌ Generación de embeddings (Embedding & Indexing)
- ❌ Búsqueda semántica (Knowledge Retrieval)
- ❌ Generación de respuestas (RAG Assistant)

### Comunicación con Otros Contextos

```
Content Ingestion
    ↓ (ContentIngestedEvent)
Document Processing
    ↓ (DocumentProcessedEvent)
Embedding & Indexing
```

---

## 2. Estructura de Archivos Completa

```
src/document-processing/
├── domain/
│   ├── aggregates/
│   │   └── processed-document.ts          # Aggregate Root
│   ├── entities/
│   │   └── document-chunk.ts              # Chunk entity
│   ├── value-objects/
│   │   ├── chunk-hash.ts
│   │   ├── chunk-position.ts
│   │   ├── crypto-entity.ts
│   │   ├── temporal-context.ts
│   │   ├── quality-score.ts
│   │   └── processing-status.ts
│   ├── interfaces/
│   │   ├── repositories/
│   │   │   ├── processed-document-write.ts
│   │   │   └── processed-document-read.ts
│   │   ├── factories/
│   │   │   └── processed-document-factory.ts
│   │   └── services/
│   │       ├── chunking-strategy.ts
│   │       ├── entity-extractor.ts
│   │       └── temporal-extractor.ts
│   ├── read-models/
│   │   ├── processed-document.ts
│   │   └── document-chunk.ts
│   ├── services/
│   │   ├── semantic-chunker.ts
│   │   ├── crypto-entity-extractor.ts
│   │   ├── temporal-analyzer.ts
│   │   └── content-quality-analyzer.ts
│   └── events/
│       ├── document-processed.event.ts
│       ├── document-processing-failed.event.ts
│       └── chunk-created.event.ts
│
├── app/
│   ├── commands/
│   │   ├── process-document/
│   │   │   ├── command.ts
│   │   │   ├── handler.ts
│   │   │   └── result.ts
│   │   └── reprocess-document/
│   │       ├── command.ts
│   │       ├── handler.ts
│   │       └── result.ts
│   ├── queries/
│   │   ├── get-processed-document/
│   │   │   ├── query.ts
│   │   │   └── handler.ts
│   │   └── get-chunks-by-document/
│   │       ├── query.ts
│   │       └── handler.ts
│   └── events/
│       └── content-ingested/
│           ├── handler.ts
│           └── index.ts
│
├── infra/
│   ├── persistence/
│   │   ├── entities/
│   │   │   ├── processed-document.entity.ts
│   │   │   └── chunk.entity.ts
│   │   ├── repositories/
│   │   │   ├── typeorm-processed-document-write.ts
│   │   │   └── processed-document-read.ts
│   │   └── factories/
│   │       └── typeorm-processed-document-factory.ts
│   ├── chunking/
│   │   ├── langchain-recursive-chunker.ts
│   │   ├── langchain-markdown-chunker.ts
│   │   └── langchain-code-chunker.ts
│   ├── extraction/
│   │   ├── regex-crypto-entity-extractor.ts
│   │   ├── llm-crypto-entity-extractor.ts
│   │   └── hybrid-crypto-entity-extractor.ts
│   └── temporal/
│       └── chrono-temporal-extractor.ts
│
├── api/
│   ├── cli/
│   │   └── commands/
│   │       ├── process.command.ts
│   │       ├── batch-process.command.ts
│   │       └── status.command.ts
│   └── http/
│       ├── controllers/
│       │   └── processing.controller.ts
│       └── dto/
│           ├── process-document.dto.ts
│           └── processed-document-response.dto.ts
│
├── config/
│   └── processing-config.ts
│
├── migrations/
│   └── 1704000000001-CreateProcessingTables.ts
│
├── index.ts
└── document-processing.module.ts
```

---

## 3. Agregados y Entidades Detallados

### ProcessedDocument (Aggregate Root)

```typescript
export class ProcessedDocument extends AggregateRoot<string> {
  private _contentItemId: string;
  private _chunks: DocumentChunk[];
  private _status: ProcessingStatus;
  private _metadata: DocumentMetadata;
  private _version: number;
  private _processedAt: Date;
  private _processingDuration: number;

  // Factory methods
  static create(contentItemId: string): ProcessedDocument;
  static reconstitute(id: string, props: ProcessedDocumentProps): ProcessedDocument;

  // Business methods
  addChunk(chunk: DocumentChunk): void {
    this.validateChunk(chunk);
    this._chunks.push(chunk);
    this.addDomainEvent(new ChunkCreatedEvent(chunk.id, this.id));
  }

  markAsProcessed(): void {
    this.validateCanComplete();
    this._status = ProcessingStatus.completed();
    this._processedAt = new Date();
    this.incrementVersion();
    this.addDomainEvent(new DocumentProcessedEvent(this.id, this._contentItemId));
  }

  markAsFailed(error: ProcessingError): void {
    this._status = ProcessingStatus.failed();
    this.incrementVersion();
    this.addDomainEvent(new DocumentProcessingFailedEvent(this.id, error));
  }

  // Invariants
  private validateChunk(chunk: DocumentChunk): void {
    if (this._chunks.length >= 100) {
      throw new TooManyChunksError();
    }
    if (this._chunks.some((c) => c.hash.equals(chunk.hash))) {
      throw new DuplicateChunkError();
    }
  }

  private validateCanComplete(): void {
    if (this._chunks.length === 0) {
      throw new NoChunksError();
    }
    if (!this._status.isPending()) {
      throw new InvalidStatusTransitionError();
    }
  }

  // Getters
  get contentItemId(): string {
    return this._contentItemId;
  }
  get chunks(): ReadonlyArray<DocumentChunk> {
    return this._chunks;
  }
  get status(): ProcessingStatus {
    return this._status;
  }
  get chunkCount(): number {
    return this._chunks.length;
  }
}
```

### DocumentChunk (Entity)

```typescript
export class DocumentChunk {
  private _id: string;
  private _documentId: string;
  private _content: string;
  private _position: ChunkPosition;
  private _hash: ChunkHash;
  private _entities: CryptoEntity[];
  private _temporalContext: TemporalContext;
  private _qualityScore: QualityScore;

  // Factory methods
  static create(props: ChunkProps): DocumentChunk;

  // Business methods
  enrichWithEntities(entities: CryptoEntity[]): void {
    this._entities = entities;
  }

  setTemporalContext(context: TemporalContext): void {
    this._temporalContext = context;
  }

  calculateQualityScore(analyzer: ContentQualityAnalyzer): void {
    this._qualityScore = analyzer.analyze(this._content);
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get content(): string {
    return this._content;
  }
  get hash(): ChunkHash {
    return this._hash;
  }
  get entities(): ReadonlyArray<CryptoEntity> {
    return this._entities;
  }
}
```

---

## 4. Value Objects Completos

### ChunkHash

```typescript
export class ChunkHash extends ValueObject<ChunkHashProps> {
  protected validate(): void {
    if (!this.props.value || this.props.value.length !== 64) {
      throw new Error('Invalid hash: must be 64-character hex string');
    }
  }

  static create(content: string): ChunkHash {
    const hash = createHash('sha256').update(content).digest('hex');
    return new ChunkHash({ value: hash, algorithm: 'sha256' });
  }

  get value(): string {
    return this.props.value;
  }
  get algorithm(): string {
    return this.props.algorithm;
  }
}
```

### CryptoEntity

```typescript
export class CryptoEntity extends ValueObject<CryptoEntityProps> {
  protected validate(): void {
    if (!this.props.type || !this.props.value) {
      throw new Error('Entity must have type and value');
    }
    if (this.props.confidence < 0 || this.props.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
  }

  static token(value: string, confidence: number = 1.0): CryptoEntity {
    return new CryptoEntity({ type: 'token', value, confidence });
  }

  static exchange(value: string, confidence: number = 1.0): CryptoEntity {
    return new CryptoEntity({ type: 'exchange', value, confidence });
  }

  get type(): EntityType {
    return this.props.type;
  }
  get value(): string {
    return this.props.value;
  }
  get confidence(): number {
    return this.props.confidence;
  }
}
```

### TemporalContext

```typescript
export class TemporalContext extends ValueObject<TemporalContextProps> {
  protected validate(): void {
    if (!this.props.publishedAt) {
      throw new Error('Published date is required');
    }
  }

  static create(publishedAt: Date, eventTimestamp?: Date): TemporalContext {
    return new TemporalContext({ publishedAt, eventTimestamp });
  }

  get publishedAt(): Date {
    return this.props.publishedAt;
  }
  get eventTimestamp(): Date | undefined {
    return this.props.eventTimestamp;
  }
  get isHistorical(): boolean {
    return this.eventTimestamp && this.eventTimestamp < this.publishedAt;
  }
}
```

---

## 5. Eventos del Dominio

### DocumentProcessedEvent

```typescript
export class DocumentProcessedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly contentItemId: string,
    public readonly chunkCount: number,
    public readonly processingDuration: number,
    public readonly occurredAt: Date = new Date(),
  ) {
    super();
  }

  get aggregateId(): string {
    return this.documentId;
  }
}
```

### DocumentProcessingFailedEvent

```typescript
export class DocumentProcessingFailedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly contentItemId: string,
    public readonly error: string,
    public readonly stackTrace: string,
    public readonly occurredAt: Date = new Date(),
  ) {
    super();
  }

  get aggregateId(): string {
    return this.documentId;
  }
}
```

---

## 6. Commands y Queries

### ProcessDocumentCommand

```typescript
export class ProcessDocumentCommand {
  constructor(
    public readonly contentItemId: string,
    public readonly config?: ProcessingConfig,
  ) {}
}

@CommandHandler(ProcessDocumentCommand)
export class ProcessDocumentHandler implements ICommandHandler<ProcessDocumentCommand> {
  constructor(
    private contentItemFactory: IContentItemFactory,
    private documentFactory: IProcessedDocumentFactory,
    private chunker: SemanticChunker,
    private entityExtractor: CryptoEntityExtractor,
    private temporalAnalyzer: TemporalAnalyzer,
    private qualityAnalyzer: ContentQualityAnalyzer,
    private repository: IProcessedDocumentWriteRepository,
    private eventBus: IEventBus,
  ) {}

  async execute(command: ProcessDocumentCommand): Promise<ProcessDocumentResult> {
    const startTime = Date.now();

    // 1. Load content item
    const contentItem = await this.contentItemFactory.load(command.contentItemId);
    if (!contentItem) {
      throw new ContentItemNotFoundError(command.contentItemId);
    }

    // 2. Create processed document
    const document = ProcessedDocument.create(command.contentItemId);

    // 3. Chunk content
    const chunkTexts = await this.chunker.chunk(
      contentItem.content,
      command.config?.chunking || DEFAULT_CHUNKING_CONFIG,
    );

    // 4. Process each chunk
    for (const [index, chunkText] of chunkTexts.entries()) {
      // 4.1 Create chunk
      const chunk = DocumentChunk.create({
        documentId: document.id,
        content: chunkText,
        position: ChunkPosition.create(index, chunkText.length),
      });

      // 4.2 Extract entities
      const entities = await this.entityExtractor.extract(chunkText);
      chunk.enrichWithEntities(entities);

      // 4.3 Analyze temporal context
      const temporalContext = await this.temporalAnalyzer.analyze(
        chunkText,
        contentItem.publishedAt,
      );
      chunk.setTemporalContext(temporalContext);

      // 4.4 Calculate quality score
      chunk.calculateQualityScore(this.qualityAnalyzer);

      // 4.5 Add chunk to document
      document.addChunk(chunk);
    }

    // 5. Mark as processed
    const duration = Date.now() - startTime;
    document.markAsProcessed();

    // 6. Save
    await this.repository.save(document);

    // 7. Publish events
    await this.eventBus.publishAll(document.domainEvents);

    return ProcessDocumentResult.success(document.id, document.chunkCount, duration);
  }
}
```

---

## 7. CLI Commands

### process:document

```bash
# Procesar un documento específico
npm run cli process:document <content-item-id>

# Con configuración personalizada
npm run cli process:document <content-item-id> \
  --chunk-size 800 \
  --chunk-overlap 150 \
  --strategy markdown

# Ejemplos
npm run cli process:document abc123
npm run cli process:document abc123 --strategy code
```

### process:batch

```bash
# Procesar múltiples documentos
npm run cli process:batch --source twitter --limit 100

# Con paralelismo
npm run cli process:batch --source rss --parallel 4

# Ejemplos
npm run cli process:batch --source all --limit 1000
npm run cli process:batch --status pending --parallel 8
```

### process:status

```bash
# Ver estado de procesamiento
npm run cli process:status --document-id abc123

# Ver estadísticas generales
npm run cli process:status --summary

# Ejemplos
npm run cli process:status --document-id abc123
npm run cli process:status --summary --last-24h
```

---

## 8. API HTTP (Opcional)

### POST /api/processing/documents

```typescript
// Request
POST /api/processing/documents
Content-Type: application/json

{
  "contentItemId": "abc123",
  "config": {
    "chunking": {
      "strategy": "recursive",
      "chunkSize": 1000,
      "chunkOverlap": 200
    }
  }
}

// Response 202 Accepted
{
  "documentId": "doc-xyz789",
  "status": "processing",
  "estimatedDuration": 5000
}
```

### GET /api/processing/documents/:id

```typescript
// Request
GET /api/processing/documents/doc-xyz789

// Response 200 OK
{
  "id": "doc-xyz789",
  "contentItemId": "abc123",
  "status": "completed",
  "chunkCount": 15,
  "processedAt": "2025-01-08T10:30:00Z",
  "processingDuration": 4523,
  "chunks": [
    {
      "id": "chunk-1",
      "content": "Bitcoin reached a new all-time high...",
      "entities": [
        { "type": "token", "value": "Bitcoin", "confidence": 1.0 }
      ],
      "qualityScore": 0.85
    }
  ]
}
```

---

## 9. Métricas y Observabilidad

### Métricas de Performance

```typescript
// Prometheus metrics
processing_duration_seconds{status="success"} 4.523
processing_duration_seconds{status="failed"} 2.1
processing_throughput_docs_per_minute 120
processing_chunks_per_document{p50} 12
processing_chunks_per_document{p95} 25
```

### Métricas de Calidad

```typescript
chunk_quality_score{p50} 0.75
chunk_quality_score{p95} 0.92
entity_extraction_precision 0.85
entity_extraction_recall 0.90
temporal_detection_accuracy 0.88
```

### Logging

```typescript
logger.info('Document processing started', {
  documentId,
  contentItemId,
  config,
});

logger.info('Document processing completed', {
  documentId,
  chunkCount,
  duration,
  entities: entityCount,
});

logger.error('Document processing failed', {
  documentId,
  error: error.message,
  stackTrace: error.stack,
});
```

---

## 10. Testing

### Unit Tests

```typescript
describe('ProcessedDocument', () => {
  it('should create a new document', () => {
    const doc = ProcessedDocument.create('content-123');
    expect(doc.contentItemId).toBe('content-123');
    expect(doc.status.isPending()).toBe(true);
  });

  it('should add chunks', () => {
    const doc = ProcessedDocument.create('content-123');
    const chunk = DocumentChunk.create({
      documentId: doc.id,
      content: 'Test content',
      position: ChunkPosition.create(0, 12),
    });

    doc.addChunk(chunk);
    expect(doc.chunkCount).toBe(1);
  });

  it('should not allow duplicate chunks', () => {
    const doc = ProcessedDocument.create('content-123');
    const chunk1 = DocumentChunk.create({
      documentId: doc.id,
      content: 'Test content',
      position: ChunkPosition.create(0, 12),
    });
    const chunk2 = DocumentChunk.create({
      documentId: doc.id,
      content: 'Test content', // Same content = same hash
      position: ChunkPosition.create(0, 12),
    });

    doc.addChunk(chunk1);
    expect(() => doc.addChunk(chunk2)).toThrow(DuplicateChunkError);
  });
});
```

### Property-Based Tests

```typescript
import * as fc from 'fast-check';

describe('ChunkHash Properties', () => {
  it('should generate consistent hashes', () => {
    fc.assert(
      fc.property(fc.string(), (content) => {
        const hash1 = ChunkHash.create(content);
        const hash2 = ChunkHash.create(content);
        return hash1.equals(hash2);
      }),
    );
  });

  it('should generate different hashes for different content', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (content1, content2) => {
        fc.pre(content1 !== content2);
        const hash1 = ChunkHash.create(content1);
        const hash2 = ChunkHash.create(content2);
        return !hash1.equals(hash2);
      }),
    );
  });
});
```

---

## 11. Seguridad

### Validación de Inputs

```typescript
// Validar content item ID
if (!contentItemId || typeof contentItemId !== 'string') {
  throw new InvalidInputError('Content item ID must be a non-empty string');
}

// Validar configuración
if (config.chunkSize < 100 || config.chunkSize > 5000) {
  throw new InvalidConfigError('Chunk size must be between 100 and 5000');
}

// Sanitizar contenido
const sanitizedContent = sanitize(content, {
  allowedTags: [],
  allowedAttributes: {},
});
```

### Rate Limiting

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
@Post('documents')
async processDocument(@Body() dto: ProcessDocumentDto) {
  // ...
}
```

### Secrets Management

```typescript
// NO hardcodear API keys
// ❌ const OPENAI_API_KEY = 'sk-...';

// ✅ Usar variables de entorno
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Validar que existan
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}
```

---

## Próximos Pasos

1. **Leer documentación detallada**: Revisar documentos individuales
2. **Setup de desarrollo**: Configurar entorno local
3. **Implementar Domain Layer**: Comenzar con aggregates y value objects
4. **Implementar Application Layer**: Commands y queries
5. **Implementar Infrastructure**: Repositories y servicios externos
6. **Implementar API Layer**: CLI y HTTP
7. **Testing**: Unit, integration, y E2E tests
8. **Deployment**: Configurar producción

---

**Creado**: 2025-01-08
**Versión**: 1.0
**Mantenedor**: Equipo de Desarrollo
