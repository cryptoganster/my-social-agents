# Document Processing - Arquitectura

## Visión General de la Arquitectura

El Document Processing Context sigue estrictamente **Clean Architecture** con 4 capas bien definidas:

```
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                            │
│              (CLI Commands, HTTP Controllers)               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Application Layer                         │
│         (Use Cases, Commands, Queries, Handlers)            │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                     Domain Layer                            │
│    (Aggregates, Entities, Value Objects, Services)         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Infrastructure Layer                        │
│  (Repositories, External Services, Database, LangChain)     │
└─────────────────────────────────────────────────────────────┘
```

## Principios Arquitectónicos

### 1. Dependency Rule

**Regla**: Las dependencias apuntan hacia adentro (hacia el dominio).

```
API → Application → Domain ← Infrastructure
```

- ✅ Domain NO depende de nada
- ✅ Application depende solo de Domain
- ✅ Infrastructure depende de Domain (implementa interfaces)
- ✅ API depende de Application

### 2. Domain Purity

**Regla**: El Domain Layer debe ser puro (sin dependencias externas).

```typescript
// ❌ MAL: Domain con dependencias externas
import { RecursiveCharacterTextSplitter } from 'langchain'; // ❌

export class DocumentChunker {
  chunk(content: string): Chunk[] {
    const splitter = new RecursiveCharacterTextSplitter(); // ❌
    return splitter.split(content);
  }
}
```

```typescript
// ✅ BIEN: Domain con interfaces
export interface IChunkingStrategy {
  chunk(content: string): Chunk[];
}

export class DocumentChunker {
  constructor(private strategy: IChunkingStrategy) {} // ✅

  chunk(content: string): Chunk[] {
    return this.strategy.chunk(content);
  }
}
```

### 3. CQRS (Command Query Responsibility Segregation)

**Regla**: Separar operaciones de escritura (Commands) y lectura (Queries).

**Commands** (Write):

- `ProcessDocumentCommand`
- `ReprocessDocumentCommand`
- `DeleteProcessedDocumentCommand`

**Queries** (Read):

- `GetProcessedDocumentQuery`
- `GetChunksByDocumentQuery`
- `GetDocumentsByStatusQuery`

## Capas de la Arquitectura

### Domain Layer (Capa de Dominio)

**Responsabilidad**: Contener la lógica de negocio pura.

**Componentes**:

#### 1. Aggregates (Raíces de Agregado)

**`ProcessedDocument`** (Aggregate Root)

```typescript
export class ProcessedDocument extends AggregateRoot<string> {
  private _contentItemId: string;
  private _chunks: DocumentChunk[];
  private _status: ProcessingStatus;
  private _metadata: DocumentMetadata;
  private _version: number;

  // Business methods
  addChunk(chunk: DocumentChunk): void
  markAsProcessed(): void
  markAsFailed(error: ProcessingError): void
  incrementVersion(): void

  // Invariants
  - Must have at least one chunk
  - Chunks must not overlap incorrectly
  - Status transitions must be valid
}
```

#### 2. Entities (Entidades)

**`DocumentChunk`**

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

  // Methods
  enrichWithEntities(entities: CryptoEntity[]): void;
  setTemporalContext(context: TemporalContext): void;
  calculateQualityScore(): QualityScore;
}
```

#### 3. Value Objects

- **`ChunkHash`**: Hash único del chunk (SHA-256)
- **`ChunkPosition`**: Posición en el documento (start, end, index)
- **`CryptoEntity`**: Entidad crypto extraída (type, value, confidence)
- **`TemporalContext`**: Contexto temporal (publishedAt, eventTimestamp, window)
- **`QualityScore`**: Score de calidad (0-1)
- **`ProcessingStatus`**: Estado del procesamiento (pending, processing, completed, failed)

#### 4. Domain Services

**`SemanticChunker`**

```typescript
export class SemanticChunker {
  constructor(private strategy: IChunkingStrategy) {}

  chunk(content: string, config: ChunkingConfig): DocumentChunk[] {
    // Lógica de chunking semántico
  }
}
```

**`CryptoEntityExtractor`**

```typescript
export class CryptoEntityExtractor {
  constructor(private extractors: IEntityExtractor[]) {}

  extract(content: string): CryptoEntity[] {
    // Lógica de extracción de entidades
  }
}
```

**`ContentQualityAnalyzer`**

```typescript
export class ContentQualityAnalyzer {
  analyze(content: string): QualityScore {
    // Lógica de análisis de calidad
  }
}
```

**`TemporalAnalyzer`**

```typescript
export class TemporalAnalyzer {
  analyze(content: string, publishedAt: Date): TemporalContext {
    // Lógica de análisis temporal
  }
}
```

#### 5. Interfaces (Ports)

**Repositories**:

```typescript
export interface IProcessedDocumentWriteRepository {
  save(document: ProcessedDocument): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IProcessedDocumentReadRepository {
  findById(id: string): Promise<ProcessedDocumentReadModel | null>;
  findByContentItemId(contentItemId: string): Promise<ProcessedDocumentReadModel | null>;
  findByStatus(status: ProcessingStatus): Promise<ProcessedDocumentReadModel[]>;
}
```

**Factories**:

```typescript
export interface IProcessedDocumentFactory {
  load(id: string): Promise<ProcessedDocument | null>;
  create(contentItemId: string, chunks: DocumentChunk[]): ProcessedDocument;
}
```

**External Services**:

```typescript
export interface IChunkingStrategy {
  chunk(content: string, config: ChunkingConfig): string[];
}

export interface IEntityExtractor {
  extract(content: string): CryptoEntity[];
}

export interface ITemporalExtractor {
  extract(content: string): TemporalContext;
}
```

#### 6. Domain Events

```typescript
export class DocumentProcessedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly contentItemId: string,
    public readonly chunkCount: number,
    public readonly occurredAt: Date,
  ) {}
}

export class DocumentProcessingFailedEvent extends DomainEvent {
  constructor(
    public readonly documentId: string,
    public readonly contentItemId: string,
    public readonly error: string,
    public readonly occurredAt: Date,
  ) {}
}

export class ChunkCreatedEvent extends DomainEvent {
  constructor(
    public readonly chunkId: string,
    public readonly documentId: string,
    public readonly entities: CryptoEntity[],
    public readonly occurredAt: Date,
  ) {}
}
```

---

### Application Layer (Capa de Aplicación)

**Responsabilidad**: Orquestar casos de uso y coordinar el dominio.

**Componentes**:

#### 1. Commands

**`ProcessDocumentCommand`**

```typescript
export class ProcessDocumentCommand {
  constructor(
    public readonly contentItemId: string,
    public readonly config?: ProcessingConfig,
  ) {}
}

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
    // 1. Load content item
    // 2. Chunk content
    // 3. Extract entities
    // 4. Analyze temporal context
    // 5. Calculate quality scores
    // 6. Create ProcessedDocument aggregate
    // 7. Save to repository
    // 8. Publish events
  }
}
```

**`ReprocessDocumentCommand`**

```typescript
export class ReprocessDocumentCommand {
  constructor(
    public readonly documentId: string,
    public readonly reason: string,
  ) {}
}
```

#### 2. Queries

**`GetProcessedDocumentQuery`**

```typescript
export class GetProcessedDocumentQuery {
  constructor(public readonly documentId: string) {}
}

export class GetProcessedDocumentHandler implements IQueryHandler<GetProcessedDocumentQuery> {
  constructor(private repository: IProcessedDocumentReadRepository) {}

  async execute(query: GetProcessedDocumentQuery): Promise<ProcessedDocumentReadModel> {
    return await this.repository.findById(query.documentId);
  }
}
```

**`GetChunksByDocumentQuery`**

```typescript
export class GetChunksByDocumentQuery {
  constructor(public readonly documentId: string) {}
}
```

#### 3. Event Handlers

**`ContentIngestedEventHandler`**

```typescript
@EventsHandler(ContentIngestedEvent)
export class ContentIngestedEventHandler {
  constructor(private commandBus: CommandBus) {}

  async handle(event: ContentIngestedEvent): Promise<void> {
    // Trigger document processing when content is ingested
    await this.commandBus.execute(new ProcessDocumentCommand(event.contentItemId));
  }
}
```

---

### Infrastructure Layer (Capa de Infraestructura)

**Responsabilidad**: Implementar detalles técnicos y dependencias externas.

**Componentes**:

#### 1. Repositories

**`TypeOrmProcessedDocumentWriteRepository`**

```typescript
@Injectable()
export class TypeOrmProcessedDocumentWriteRepository implements IProcessedDocumentWriteRepository {
  constructor(
    @InjectRepository(ProcessedDocumentEntity)
    private repository: Repository<ProcessedDocumentEntity>,
  ) {}

  async save(document: ProcessedDocument): Promise<void> {
    const entity = this.toEntity(document);
    await this.repository.save(entity);
  }
}
```

**`ProcessedDocumentReadRepository`**

```typescript
@Injectable()
export class ProcessedDocumentReadRepository implements IProcessedDocumentReadRepository {
  constructor(
    @InjectRepository(ProcessedDocumentEntity)
    private repository: Repository<ProcessedDocumentEntity>,
  ) {}

  async findById(id: string): Promise<ProcessedDocumentReadModel | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toReadModel(entity) : null;
  }
}
```

#### 2. Chunking Implementations

**`LangChainRecursiveChunker`**

```typescript
@Injectable()
export class LangChainRecursiveChunker implements IChunkingStrategy {
  chunk(content: string, config: ChunkingConfig): string[] {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
    return splitter.splitText(content);
  }
}
```

**`LangChainMarkdownChunker`**

```typescript
@Injectable()
export class LangChainMarkdownChunker implements IChunkingStrategy {
  chunk(content: string, config: ChunkingConfig): string[] {
    const splitter = new MarkdownTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
    return splitter.splitText(content);
  }
}
```

#### 3. Entity Extraction Implementations

**`RegexCryptoEntityExtractor`**

```typescript
@Injectable()
export class RegexCryptoEntityExtractor implements IEntityExtractor {
  private readonly TOKEN_PATTERN = /\b[A-Z]{2,5}\b/g;
  private readonly PRICE_PATTERN = /\$[\d,]+\.?\d*/g;

  extract(content: string): CryptoEntity[] {
    const tokens = this.extractTokens(content);
    const prices = this.extractPrices(content);
    return [...tokens, ...prices];
  }
}
```

**`LLMCryptoEntityExtractor`**

```typescript
@Injectable()
export class LLMCryptoEntityExtractor implements IEntityExtractor {
  constructor(private llm: ChatOpenAI) {}

  async extract(content: string): Promise<CryptoEntity[]> {
    const prompt = `Extract crypto entities from: "${content}"`;
    const response = await this.llm.invoke(prompt);
    return this.parseResponse(response);
  }
}
```

**`HybridCryptoEntityExtractor`**

```typescript
@Injectable()
export class HybridCryptoEntityExtractor implements IEntityExtractor {
  constructor(
    private regexExtractor: RegexCryptoEntityExtractor,
    private llmExtractor: LLMCryptoEntityExtractor,
  ) {}

  async extract(content: string): Promise<CryptoEntity[]> {
    // 1. Try regex first (fast)
    const regexEntities = this.regexExtractor.extract(content);

    // 2. If not enough entities, use LLM
    if (regexEntities.length < 3) {
      const llmEntities = await this.llmExtractor.extract(content);
      return this.merge(regexEntities, llmEntities);
    }

    return regexEntities;
  }
}
```

#### 4. Temporal Analysis Implementations

**`ChronoTemporalExtractor`**

```typescript
@Injectable()
export class ChronoTemporalExtractor implements ITemporalExtractor {
  extract(content: string): TemporalContext {
    const dates = chrono.parse(content);
    return this.buildTemporalContext(dates);
  }
}
```

#### 5. Database Entities

**`ProcessedDocumentEntity`**

```typescript
@Entity('processed_documents')
export class ProcessedDocumentEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  contentItemId: string;

  @Column()
  status: string;

  @Column()
  version: number;

  @OneToMany(() => ChunkEntity, (chunk) => chunk.document)
  chunks: ChunkEntity[];

  @Column('jsonb')
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**`ChunkEntity`**

```typescript
@Entity('document_chunks')
export class ChunkEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  documentId: string;

  @ManyToOne(() => ProcessedDocumentEntity, (doc) => doc.chunks)
  document: ProcessedDocumentEntity;

  @Column('text')
  content: string;

  @Column()
  hash: string;

  @Column('jsonb')
  position: any;

  @Column('jsonb')
  entities: any[];

  @Column('jsonb')
  temporalContext: any;

  @Column('float')
  qualityScore: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### API Layer (Capa de API)

**Responsabilidad**: Exponer funcionalidad a través de CLI y HTTP.

**Componentes**:

#### 1. CLI Commands

**`ProcessCommand`**

```typescript
@Command({
  name: 'process:document',
  description: 'Process a document by content item ID',
})
export class ProcessCommand extends CommandRunner {
  constructor(private commandBus: CommandBus) {
    super();
  }

  async run(inputs: string[], options: Record<string, any>): Promise<void> {
    const contentItemId = inputs[0];
    await this.commandBus.execute(new ProcessDocumentCommand(contentItemId));
  }
}
```

#### 2. HTTP Controllers (Opcional)

**`ProcessingController`**

```typescript
@Controller('processing')
export class ProcessingController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post('documents')
  async processDocument(@Body() dto: ProcessDocumentDto) {
    return await this.commandBus.execute(new ProcessDocumentCommand(dto.contentItemId));
  }

  @Get('documents/:id')
  async getDocument(@Param('id') id: string) {
    return await this.queryBus.execute(new GetProcessedDocumentQuery(id));
  }
}
```

---

## Flujo de Procesamiento Completo

```
1. Content Ingestion Context
   ↓ (publishes ContentIngestedEvent)

2. ContentIngestedEventHandler (Application Layer)
   ↓ (triggers ProcessDocumentCommand)

3. ProcessDocumentHandler (Application Layer)
   ├─ Load ContentItem (via Factory)
   ├─ Chunk content (via SemanticChunker)
   ├─ Extract entities (via CryptoEntityExtractor)
   ├─ Analyze temporal context (via TemporalAnalyzer)
   ├─ Calculate quality scores (via ContentQualityAnalyzer)
   ├─ Create ProcessedDocument aggregate (Domain)
   ├─ Save to repository (Infrastructure)
   └─ Publish DocumentProcessedEvent (Domain Event)

4. Embedding & Indexing Context
   ↓ (listens to DocumentProcessedEvent)

5. Generate embeddings and index
```

---

**Documento anterior**: [02-observaciones-clave.md](./02-observaciones-clave.md)
**Siguiente documento**: [04-tech-stack.md](./04-tech-stack.md)
