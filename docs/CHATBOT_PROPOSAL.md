# Propuesta: Sistema de Chatbot Conversacional con RAG para Crypto

## Contexto

Basándome en la documentación proporcionada y la arquitectura existente del proyecto, propongo crear un **Bounded Context** nuevo para el sistema de chatbot conversacional con capacidades RAG (Retrieval-Augmented Generation).

---

## 1. Análisis de la Arquitectura Actual

### Bounded Contexts Existentes

- ✅ **Content Ingestion** - Implementado (ingesta multi-fuente)
- 🚧 **Document Processing** - Planificado (chunking semántico)
- 🚧 **Embedding & Indexing** - Planificado (vectorización)
- 🚧 **Retrieval & Re-Ranking** - Planificado (búsqueda híbrida)
- 🚧 **Knowledge Query/Chat** - Planificado (Q&A conversacional)
- 🚧 **Signals & Analytics** - Planificado (detección de tendencias)
- 🚧 **Identity & Configuration** - Planificado (configuración)

### Observaciones Clave

1. Ya existe infraestructura de ingesta robusta
2. La arquitectura sigue Clean Architecture + DDD estrictamente
3. El sistema está diseñado para ser CLI-first con API headless
4. Hay separación clara entre bounded contexts
5. Infraestructura pluggable (LLMs, embeddings, vector DBs)

---

## 2. Propuesta de Bounded Context: "Conversational Intelligence"

### Nombre Propuesto

**`conversational-intelligence`** (o `conversation` para simplificar)

### Justificación del Nombre

- Refleja la naturaleza conversacional del sistema
- Engloba tanto chat como query intelligence
- Diferencia clara de "Knowledge Query/Chat" (que es más genérico)
- Alineado con la terminología del dominio crypto

### Responsabilidades del Contexto

#### Core Responsibilities

1. **Gestión de Conversaciones**
   - Crear y mantener sesiones de chat
   - Persistir historial conversacional
   - Gestionar contexto multi-turno
   - Manejar referencias anafóricas ("eso", "el anterior", etc.)

2. **Orquestación RAG**
   - Coordinar búsqueda semántica (Retrieval)
   - Integrar re-ranking de resultados
   - Construir contexto para el LLM
   - Generar respuestas con citaciones

3. **Query Understanding**
   - Detectar intención del usuario
   - Extraer entidades crypto (tokens, exchanges, eventos)
   - Identificar dimensión temporal de la pregunta
   - Reformular queries basándose en historial

4. **Response Generation**
   - Generar respuestas contextualizadas
   - Incluir source attribution
   - Formatear respuestas (markdown, JSON, texto)
   - Controlar longitud y detalle

5. **Conversational Memory**
   - Short-term memory (sesión actual)
   - Long-term memory (preferencias, contexto histórico)
   - Checkpointing de estado conversacional

---

## 3. Arquitectura Propuesta

### 3.1 Patrón Arquitectónico

Seguiremos el patrón **Perplexity-style** con embedding "on the fly":

```
User Query
    ↓
Query Understanding (extract intent, entities, temporal context)
    ↓
History-Aware Retrieval (reformulate query with conversation context)
    ↓
Semantic Search (vector similarity)
    ↓
Re-Ranking (signals-based scoring)
    ↓
Context Assembly (top-K chunks + metadata)
    ↓
LLM Generation (with citations)
    ↓
Response + Sources
```

### 3.2 Capas de Almacenamiento

#### 1. PostgreSQL (Relational)

- Conversaciones (sessions)
- Mensajes (user + assistant)
- Metadata de queries
- Source citations
- User preferences
- Conversation checkpoints

#### 2. Vector DB (Embeddings)

- Chunks indexados (del Document Processing context)
- Embeddings persistidos
- Metadata mínima (url, title, timestamp, asset_tags)

#### 3. Redis (Cache/Memory)

- Conversational context (short-term)
- Query embeddings temporales
- Retrieved chunks cache
- Rate limiting

### 3.3 Integración con Otros Contexts

```
┌─────────────────────────────────────────────────────────┐
│         Conversational Intelligence Context             │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Conversation │  │ Query        │  │ Response     │ │
│  │ Management   │  │ Understanding│  │ Generation   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
           │                  │                  │
           ↓                  ↓                  ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Retrieval &      │  │ Embedding &      │  │ Signals &        │
│ Re-Ranking       │  │ Indexing         │  │ Analytics        │
│ Context          │  │ Context          │  │ Context          │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Comunicación entre contexts:**

- Domain Events (async)
- Interfaces/Ports (sync)
- Anti-Corruption Layers para servicios externos

---

## 4. Estructura del Bounded Context

```
src/conversation/
├── domain/
│   ├── aggregates/
│   │   ├── conversation.ts           # Aggregate root
│   │   └── message.ts                # Entity dentro del aggregate
│   │
│   ├── value-objects/
│   │   ├── conversation-id.ts
│   │   ├── message-role.ts           # user | assistant | system
│   │   ├── query-intent.ts           # question | comparison | summary | trend
│   │   ├── temporal-context.ts       # now | past | range
│   │   ├── crypto-entity.ts          # token, exchange, event
│   │   └── source-citation.ts
│   │
│   ├── interfaces/
│   │   ├── repositories/
│   │   │   ├── conversation-write.ts
│   │   │   └── conversation-read.ts
│   │   ├── factories/
│   │   │   └── conversation-factory.ts
│   │   └── services/
│   │       ├── llm-provider.ts       # Abstraction for LLM
│   │       ├── retrieval-service.ts  # Abstraction for retrieval
│   │       └── memory-service.ts     # Abstraction for memory
│   │
│   ├── read-models/
│   │   ├── conversation-summary.ts
│   │   ├── message-history.ts
│   │   └── query-result.ts
│   │
│   ├── services/
│   │   ├── query-understanding.ts    # Extract intent, entities, temporal
│   │   ├── context-builder.ts        # Build LLM context from retrieved docs
│   │   ├── response-formatter.ts     # Format responses with citations
│   │   └── conversation-memory.ts    # Manage conversational memory
│   │
│   └── events/
│       ├── conversation-started.ts
│       ├── message-sent.ts
│       ├── query-processed.ts
│       └── response-generated.ts
│
├── app/
│   ├── commands/
│   │   ├── start-conversation/
│   │   │   ├── command.ts
│   │   │   ├── handler.ts
│   │   │   └── result.ts
│   │   ├── send-message/
│   │   │   ├── command.ts
│   │   │   ├── handler.ts
│   │   │   └── result.ts
│   │   └── end-conversation/
│   │       ├── command.ts
│   │       ├── handler.ts
│   │       └── result.ts
│   │
│   ├── queries/
│   │   ├── get-conversation-history/
│   │   │   ├── query.ts
│   │   │   └── handler.ts
│   │   ├── get-active-conversations/
│   │   │   ├── query.ts
│   │   │   └── handler.ts
│   │   └── search-conversations/
│   │       ├── query.ts
│   │       └── handler.ts
│   │
│   └── events/
│       └── message-sent/
│           ├── handler.ts            # Trigger retrieval + generation
│           └── index.ts
│
├── infra/
│   ├── persistence/
│   │   ├── entities/
│   │   │   ├── conversation.entity.ts
│   │   │   └── message.entity.ts
│   │   ├── repositories/
│   │   │   ├── typeorm-conversation-write.ts
│   │   │   └── conversation-read.ts
│   │   └── factories/
│   │       └── typeorm-conversation-factory.ts
│   │
│   ├── llm/
│   │   ├── openai-provider.ts        # OpenAI implementation
│   │   ├── anthropic-provider.ts     # Claude implementation
│   │   └── ollama-provider.ts        # Local LLM implementation
│   │
│   ├── memory/
│   │   ├── redis-memory.ts           # Redis-based memory
│   │   └── in-memory.ts              # In-memory for testing
│   │
│   └── adapters/
│       ├── retrieval-adapter.ts      # Connects to Retrieval context
│       └── embedding-adapter.ts      # Connects to Embedding context
│
├── api/
│   ├── cli/
│   │   └── commands/
│   │       ├── chat.command.ts       # Interactive chat
│   │       ├── ask.command.ts        # Single query
│   │       └── history.command.ts    # View history
│   │
│   └── http/
│       ├── controllers/
│       │   └── conversation.controller.ts
│       └── dto/
│           ├── start-conversation.dto.ts
│           ├── send-message.dto.ts
│           └── conversation-response.dto.ts
│
├── config/
│   └── conversation-config.ts
│
├── migrations/
│   └── 1704000000002-CreateConversationTables.ts
│
├── index.ts
└── conversation.module.ts
```

---

## 5. Agregados y Entidades Clave

### 5.1 Conversation (Aggregate Root)

```typescript
export class Conversation extends AggregateRoot<string> {
  private _userId: string;
  private _messages: Message[];
  private _status: ConversationStatus;
  private _metadata: ConversationMetadata;
  private _createdAt: Date;
  private _updatedAt: Date;

  // Business methods
  start(userId: string): void
  sendMessage(content: string, role: MessageRole): void
  end(): void
  addContext(context: ConversationalContext): void

  // Invariants
  - Cannot send message if conversation is ended
  - Messages must alternate between user and assistant
  - Must have at least one message to be valid
}
```

### 5.2 Message (Entity)

```typescript
export class Message {
  private _id: string;
  private _conversationId: string;
  private _role: MessageRole;
  private _content: string;
  private _citations: SourceCitation[];
  private _metadata: MessageMetadata;
  private _timestamp: Date;
}
```

### 5.3 Value Objects

#### QueryIntent

```typescript
export class QueryIntent extends ValueObject {
  type: 'question' | 'comparison' | 'summary' | 'trend' | 'explanation';
  confidence: number;
  entities: CryptoEntity[];
  temporalContext: TemporalContext;
}
```

#### SourceCitation

```typescript
export class SourceCitation extends ValueObject {
  sourceId: string;
  sourceType: SourceType;
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  timestamp: Date;
}
```

---

## 6. Flujo de Procesamiento (RAG Pipeline)

### 6.1 Flujo Completo

```typescript
// 1. User sends message
const conversation = await conversationFactory.load(conversationId);
conversation.sendMessage(userMessage, MessageRole.USER);

// 2. Query Understanding
const queryIntent = await queryUnderstandingService.analyze(userMessage, conversation.getHistory());

// 3. History-Aware Retrieval
const reformulatedQuery = await contextBuilder.reformulateQuery(
  userMessage,
  conversation.getHistory(),
);

// 4. Semantic Search (via Retrieval context)
const retrievedChunks = await retrievalService.search({
  query: reformulatedQuery,
  filters: {
    temporal: queryIntent.temporalContext,
    entities: queryIntent.entities,
  },
  topK: 10,
});

// 5. Re-Ranking (via Signals context)
const rerankedChunks = await rerankingService.rerank(retrievedChunks, queryIntent);

// 6. Context Assembly
const llmContext = await contextBuilder.buildContext(
  rerankedChunks.slice(0, 5),
  conversation.getHistory(),
);

// 7. LLM Generation
const response = await llmProvider.generate({
  systemPrompt: CRYPTO_ASSISTANT_PROMPT,
  context: llmContext,
  query: userMessage,
  history: conversation.getHistory(),
});

// 8. Format Response with Citations
const formattedResponse = await responseFormatter.format(response, rerankedChunks.slice(0, 5));

// 9. Save assistant message
conversation.sendMessage(formattedResponse, MessageRole.ASSISTANT);
await conversationRepository.save(conversation);
```

---

## 7. Integración con LangChain

### 7.1 Uso de LangChain

Usaremos **LangChain** como framework de orquestación, pero manteniendo Clean Architecture:

```typescript
// Domain Interface
export interface ILLMProvider {
  generate(params: GenerationParams): Promise<string>;
  stream(params: GenerationParams): AsyncIterable<string>;
}

// Infrastructure Implementation
@Injectable()
export class LangChainLLMProvider implements ILLMProvider {
  private llm: ChatOpenAI;
  private chain: RunnableSequence;

  constructor() {
    this.llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0.2,
    });

    // Create history-aware retriever chain
    this.chain = this.buildChain();
  }

  private buildChain(): RunnableSequence {
    const contextualizePrompt = ChatPromptTemplate.fromMessages([
      ['system', CONTEXTUALIZE_SYSTEM_PROMPT],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
    ]);

    const qaPrompt = ChatPromptTemplate.fromMessages([
      ['system', QA_SYSTEM_PROMPT],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
    ]);

    return createRetrievalChain(
      createHistoryAwareRetriever(this.llm, retriever, contextualizePrompt),
      createStuffDocumentsChain(this.llm, qaPrompt),
    );
  }

  async generate(params: GenerationParams): Promise<string> {
    const result = await this.chain.invoke({
      input: params.query,
      chat_history: params.history,
      context: params.context,
    });

    return result.answer;
  }
}
```

### 7.2 Componentes LangChain a Usar

1. **LCEL (LangChain Expression Language)** - Para pipelines
2. **ChatPromptTemplate** - Para prompts estructurados
3. **create_history_aware_retriever** - Para reformulación de queries
4. **create_retrieval_chain** - Para RAG pipeline
5. **MemorySaver** - Para checkpointing conversacional
6. **Streaming** - Para respuestas en tiempo real

---

## 8. Estrategias de Optimización

### 8.1 Búsqueda Híbrida

- Combinar búsqueda semántica (vectores) + keyword (BM25)
- Implementar en el Retrieval context
- Útil para nombres exactos de tokens, exchanges

### 8.2 Multi-Query Retrieval

- Generar 3 variaciones de la misma pregunta
- Buscar todas y combinar resultados únicos
- Útil para queries ambiguas

### 8.3 Re-Ranking con Cohere

- Usar Cohere Rerank API
- Reordenar top-10 a top-5 más relevantes
- Aumenta precisión dramáticamente

### 8.4 Caching Inteligente

- Cache de embeddings de queries frecuentes
- Cache de retrieved chunks por query
- TTL basado en temporalidad del contenido

---

## 9. CLI Commands

### 9.1 Interactive Chat

```bash
npm run cli chat:start
# Inicia sesión interactiva
# Mantiene contexto conversacional
# Muestra fuentes citadas
# Permite comandos especiales (/history, /clear, /exit)
```

### 9.2 Single Query

```bash
npm run cli chat:ask "¿Qué pasó con Bitcoin esta semana?"
# Query única sin contexto conversacional
# Respuesta con citaciones
# Output en texto, JSON o markdown
```

### 9.3 History Management

```bash
npm run cli chat:history
npm run cli chat:history --conversation-id abc123
npm run cli chat:export --format json
```

---

## 10. Consideraciones de Implementación

### 10.1 Fases de Desarrollo

#### Fase 1: MVP (Core RAG)

- ✅ Conversation aggregate
- ✅ Basic query understanding
- ✅ Integration with Retrieval context
- ✅ LLM provider (OpenAI)
- ✅ CLI interactive chat
- ✅ Source citations

#### Fase 2: Advanced Features

- ✅ Multi-query retrieval
- ✅ Re-ranking
- ✅ Streaming responses
- ✅ Conversation memory (Redis)
- ✅ HTTP API

#### Fase 3: Optimization

- ✅ Hybrid search
- ✅ Caching strategies
- ✅ Multiple LLM providers
- ✅ Advanced query understanding
- ✅ Conversation analytics

### 10.2 Dependencias Externas

```json
{
  "dependencies": {
    "langchain": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "@langchain/community": "^0.3.0",
    "zod": "^3.22.0",
    "commander": "^12.0.0",
    "ink": "^4.0.0",
    "redis": "^4.6.0"
  }
}
```

---

## 11. Métricas y Observabilidad

### 11.1 Métricas Clave

- Latencia de respuesta (p50, p95, p99)
- Calidad de retrieval (precision@k, recall@k)
- Relevancia de respuestas (RAGAS metrics)
- Tasa de citaciones correctas
- Conversaciones activas
- Mensajes por conversación

### 11.2 Herramientas

- **LangSmith** - Tracing completo de chains
- **RAGAS** - Evaluación automática de RAG
  - Faithfulness (respuesta basada en contexto)
  - Answer Relevance (responde lo preguntado)
  - Context Precision
  - Context Recall

---

## 12. Testing Strategy

### 12.1 Unit Tests

- Domain logic (aggregates, value objects, services)
- Query understanding
- Context building
- Response formatting

### 12.2 Integration Tests

- RAG pipeline completo
- LLM provider integration
- Retrieval context integration
- Memory persistence

### 12.3 Property-Based Tests

- Conversation invariants
- Message ordering
- Citation consistency

### 12.4 Golden Tests

- Respuestas esperadas para queries conocidas
- Regresión de calidad

---

## 13. Seguridad

### 13.1 Prompt Injection Protection

- Sanitización de inputs
- System prompts protegidos
- Validación de comandos especiales

### 13.2 Rate Limiting

- Por usuario
- Por conversación
- Por endpoint API

### 13.3 Data Privacy

- No persistir datos sensibles
- Encriptación de conversaciones (opcional)
- Retención configurable

---

## 14. Próximos Pasos

### Paso 1: Validación de Propuesta

- Revisar bounded context propuesto
- Validar nombres y responsabilidades
- Ajustar estructura si es necesario

### Paso 2: Crear Spec (Requirements)

- Definir user stories
- Definir acceptance criteria (EARS format)
- Identificar dependencias con otros contexts

### Paso 3: Diseño Detallado

- Definir aggregates y value objects
- Definir interfaces y contratos
- Definir correctness properties (PBT)

### Paso 4: Implementación Incremental

- Fase 1: MVP
- Fase 2: Advanced features
- Fase 3: Optimization

---

## 15. Preguntas para Discusión

1. **Nombre del Bounded Context**: ¿Te parece bien "conversational-intelligence" o prefieres otro nombre?

2. **Alcance del MVP**: ¿Empezamos con chat interactivo CLI o también incluimos API HTTP desde el inicio?

3. **LLM Provider**: ¿Empezamos solo con OpenAI o implementamos múltiples providers desde el inicio?

4. **Vector DB**: ¿Qué vector DB prefieres? (Qdrant, Pinecone, Weaviate, pgvector)

5. **Memoria Conversacional**: ¿Redis desde el inicio o empezamos con in-memory?

6. **Integración con Contexts Existentes**: ¿Necesitamos implementar primero Document Processing, Embedding & Indexing, y Retrieval contexts, o podemos mockearlos inicialmente?

---

## Conclusión

Esta propuesta define un bounded context robusto y bien estructurado para el sistema de chatbot conversacional, siguiendo estrictamente los principios de Clean Architecture y DDD del proyecto. La arquitectura es modular, extensible y permite implementación incremental.

¿Qué te parece? ¿Hay algo que quieras ajustar antes de proceder con la creación del spec formal?
