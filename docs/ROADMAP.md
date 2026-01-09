# Roadmap Completo: Sistema RAG para Crypto Knowledge Platform

## Visión General

Este documento detalla el roadmap completo para implementar un sistema de chatbot conversacional con RAG (Retrieval-Augmented Generation) orientado a consultas sobre criptomonedas. El sistema sigue una arquitectura basada en Clean Architecture y Domain-Driven Design, organizada en Bounded Contexts.

---

## Estado Actual

### ✅ Implementado

#### Content Ingestion Context

- **Estado**: Completamente implementado
- **Responsabilidades**:
  - Ingesta multi-fuente (web scraping, RSS, social media, PDF, OCR, Wikipedia)
  - Normalización de contenido
  - Deduplicación
  - Extracción de metadata básica
  - Gestión de jobs de ingesta
  - Configuración de fuentes

- **Componentes Clave**:
  - Aggregates: `ContentItem`, `IngestionJob`, `SourceConfiguration`
  - Value Objects: `ContentHash`, `SourceType`, `IngestionStatus`, `AssetTag`
  - Domain Services: `ContentHashGenerator`, `DuplicateDetectionService`
  - Source Adapters: Web, RSS, Social Media, PDF, OCR, Wikipedia

---

## Bounded Contexts Pendientes

### 🚧 Contextos por Implementar

1. **Refinement** (Fase 1) - Refinar contenido crudo
2. **Embedding & Indexing** (Fase 2) - Vectorización
3. **Knowledge Retrieval** (Fase 3) - Búsqueda semántica
4. **RAG Assistant** (Fase 4) - Chat conversacional
5. **Signals & Analytics** (Fase 5 - Opcional)
6. **Identity & Configuration** (Fase 6 - Opcional)

---

## Fase 1: Refinement Context

### 📅 Timeline: 4-6 semanas

### 🎯 Objetivo

Refinar contenido crudo hasta que sea útil y significativo: chunks semánticos enriquecidos, listos para ser vectorizados e indexados.

### 💡 Por Qué "Refinement"

- Lenguaje ubicuo natural: "Este contenido pasó por Refinement"
- Implica mejora de calidad, no solo transformación
- Agnóstico de implementación (no asume documentos, IA, etc.)
- Ver: `docs/refinement/00-WHY-REFINEMENT.md`

### 📦 Responsabilidades

#### Core Responsibilities

1. **Chunking Semántico**
   - Dividir documentos en fragmentos coherentes
   - Preservar contexto entre chunks
   - Mantener integridad semántica
   - Configuración flexible de tamaño

2. **Enriquecimiento de Contenido**
   - Extracción de entidades crypto (tokens, exchanges, blockchains)
   - Identificación de eventos relevantes
   - Detección de temporalidad
   - Clasificación de tipo de contenido

3. **Metadata Generation**
   - Generación de hashes de chunks
   - Timestamps y versionado
   - Relaciones entre chunks
   - Scores de calidad

4. **Content Validation**
   - Validación de calidad mínima
   - Detección de contenido spam
   - Filtrado de contenido irrelevante

### 🏗️ Arquitectura

#### Aggregates

- **`ProcessedDocument`** (Aggregate Root)
  - Representa un documento procesado completo
  - Contiene colección de chunks
  - Mantiene metadata del documento original
  - Gestiona versionado

#### Entities

- **`DocumentChunk`**
  - Fragmento semántico del documento
  - Posición y contexto
  - Metadata específica del chunk

#### Value Objects

- **`ChunkHash`** - Hash único del chunk
- **`ChunkPosition`** - Posición en el documento original
- **`CryptoEntity`** - Entidad crypto extraída (token, exchange, etc.)
- **`TemporalMarker`** - Marcador temporal del contenido
- **`ContentQualityScore`** - Score de calidad del contenido

#### Domain Services

- **`SemanticChunker`** - Chunking inteligente
- **`CryptoEntityExtractor`** - Extracción de entidades crypto
- **`TemporalAnalyzer`** - Análisis de temporalidad
- **`ContentQualityAnalyzer`** - Análisis de calidad

### 🔗 Integraciones

#### Input

- **Content Ingestion Context**
  - Consume: `ContentItem` (contenido crudo)
  - Via: Domain Events (`ContentIngestedEvent`)

#### Output

- **Embedding & Indexing Context**
  - Produce: `ProcessedDocument` con chunks
  - Via: Domain Events (`DocumentProcessedEvent`)

### 📊 Métricas Clave

- Chunks generados por documento
- Tiempo de procesamiento
- Entidades extraídas por chunk
- Score promedio de calidad
- Tasa de rechazo de contenido

### 🛠️ Stack Técnico

#### Chunking

- **LangChain Text Splitters**
  - `RecursiveCharacterTextSplitter` (general)
  - `MarkdownTextSplitter` (markdown)
  - `CodeTextSplitter` (código)

#### Entity Extraction

- **NER (Named Entity Recognition)**
  - spaCy (local)
  - OpenAI GPT-4o-mini (cloud)
  - Custom regex patterns para crypto

#### Temporal Analysis

- **Date Extraction**
  - chrono-node
  - Custom temporal parsers

### 📋 Tareas Principales

#### 1. Domain Layer (2 semanas)

- [ ] Definir aggregates y entities
- [ ] Implementar value objects
- [ ] Crear domain services
- [ ] Definir interfaces (ports)
- [ ] Implementar domain events
- [ ] Tests unitarios de dominio

#### 2. Application Layer (1 semana)

- [ ] Commands: ProcessDocument, ReprocessDocument
- [ ] Queries: GetProcessedDocument, GetChunksByDocument
- [ ] Event handlers
- [ ] Use case orchestration
- [ ] Tests de application layer

#### 3. Infrastructure Layer (2 semanas)

- [ ] Repository implementations (TypeORM)
- [ ] Chunking service implementations
- [ ] Entity extraction implementations
- [ ] Temporal analysis implementations
- [ ] Database migrations
- [ ] Tests de integración

#### 4. API Layer (1 semana)

- [ ] CLI commands (process, reprocess, status)
- [ ] HTTP controllers (opcional)
- [ ] DTOs
- [ ] Tests end-to-end

### 🎯 Entregables

1. **Bounded Context Completo**
   - Domain, App, Infra, API layers
   - Tests (unit, integration, e2e)
   - Migrations

2. **Documentación**
   - README del contexto
   - Diagramas de arquitectura
   - Guía de uso

3. **CLI Commands**
   ```bash
   npm run cli process:document --content-id <id>
   npm run cli process:batch --source <source>
   npm run cli process:status --job-id <id>
   ```

### ✅ Criterios de Éxito

- [ ] Procesa 100+ documentos sin errores
- [ ] Genera chunks semánticamente coherentes
- [ ] Extrae entidades crypto con >80% precisión
- [ ] Tiempo de procesamiento <5s por documento
- [ ] Cobertura de tests >80%

---

## Fase 2: Embedding & Indexing Context

### 📅 Timeline: 3-4 semanas

### 🎯 Objetivo

Generar embeddings vectoriales de los chunks procesados e indexarlos en una base de datos vectorial para búsqueda semántica eficiente.

### 📦 Responsabilidades

#### Core Responsibilities

1. **Embedding Generation**
   - Generar vectores de chunks
   - Soporte multi-modelo (OpenAI, Cohere, local)
   - Batch processing
   - Retry y error handling

2. **Vector Indexing**
   - Almacenar embeddings en Vector DB
   - Indexación incremental
   - Actualización de índices
   - Eliminación de embeddings obsoletos

3. **Embedding Management**
   - Versionado de embeddings
   - Tracking de modelos usados
   - Métricas de calidad
   - Cache de embeddings

4. **Index Optimization**
   - Configuración de índices
   - Optimización de búsqueda
   - Mantenimiento de índices

### 🏗️ Arquitectura

#### Aggregates

- **`EmbeddedChunk`** (Aggregate Root)
  - Chunk + embedding vector
  - Metadata del modelo usado
  - Versión del embedding
  - Timestamp de generación

#### Value Objects

- **`EmbeddingVector`** - Vector numérico (float[])
- **`EmbeddingModel`** - Modelo usado (OpenAI, Cohere, etc.)
- **`EmbeddingVersion`** - Versión del embedding
- **`VectorDimension`** - Dimensión del vector

#### Domain Services

- **`EmbeddingGenerator`** - Generación de embeddings
- **`IndexManager`** - Gestión de índices
- **`EmbeddingVersionManager`** - Versionado

### 🔗 Integraciones

#### Input

- **Document Processing Context**
  - Consume: `ProcessedDocument` con chunks
  - Via: Domain Events (`DocumentProcessedEvent`)

#### Output

- **Knowledge Retrieval Context**
  - Produce: Embeddings indexados
  - Via: Vector DB queries

### 🛠️ Stack Técnico

#### Embedding Providers

- **OpenAI** - `text-embedding-3-small` (1536 dims)
- **Cohere** - `embed-multilingual-v3.0`
- **Local** - `all-MiniLM-L6-v2` (384 dims)

#### Vector Databases

- **Opción A**: Qdrant (recomendado)
  - Open source
  - Alta performance
  - Filtros avanzados
  - Docker-friendly

- **Opción B**: Pinecone
  - Serverless
  - Escalable
  - Managed service

- **Opción C**: pgvector
  - PostgreSQL extension
  - Simplifica stack
  - Bueno para MVP

### 📋 Tareas Principales

#### 1. Domain Layer (1 semana)

- [ ] Definir aggregates y value objects
- [ ] Crear domain services
- [ ] Definir interfaces para providers
- [ ] Implementar domain events
- [ ] Tests unitarios

#### 2. Application Layer (1 semana)

- [ ] Commands: GenerateEmbedding, ReindexChunk
- [ ] Queries: GetEmbedding, SearchSimilar
- [ ] Event handlers
- [ ] Batch processing logic
- [ ] Tests

#### 3. Infrastructure Layer (1.5 semanas)

- [ ] Embedding provider implementations
- [ ] Vector DB implementations
- [ ] Repository implementations
- [ ] Cache layer (Redis)
- [ ] Migrations
- [ ] Tests de integración

#### 4. API Layer (0.5 semanas)

- [ ] CLI commands
- [ ] HTTP endpoints (opcional)
- [ ] Tests e2e

### 🎯 Entregables

1. **Bounded Context Completo**
2. **Vector DB Setup**
   - Docker compose
   - Configuración
   - Scripts de inicialización

3. **CLI Commands**
   ```bash
   npm run cli embed:generate --chunk-id <id>
   npm run cli embed:batch --document-id <id>
   npm run cli embed:reindex --all
   npm run cli embed:search --query "bitcoin price"
   ```

### ✅ Criterios de Éxito

- [ ] Genera embeddings para 1000+ chunks
- [ ] Indexación <1s por chunk
- [ ] Búsqueda semántica <100ms
- [ ] Soporte para múltiples modelos
- [ ] Cobertura de tests >80%

---

## Fase 3: Knowledge Retrieval Context

### 📅 Timeline: 4-5 semanas

### 🎯 Objetivo

Implementar búsqueda semántica avanzada con re-ranking basado en signals, filtros temporales y por entidades crypto.

### 📦 Responsabilidades

#### Core Responsibilities

1. **Semantic Search**
   - Búsqueda por similitud vectorial
   - Top-K retrieval
   - Threshold de relevancia
   - Deduplicación de resultados

2. **Hybrid Search**
   - Combinación de búsqueda semántica + keyword (BM25)
   - Fusión de scores
   - Optimización de pesos

3. **Re-Ranking**
   - Re-ranking basado en signals
   - Scoring multi-dimensional
   - Explicabilidad de scores
   - Pluggable rerankers

4. **Advanced Filtering**
   - Filtros temporales (fecha, rango)
   - Filtros por entidades (token, exchange)
   - Filtros por fuente
   - Filtros por calidad

5. **Query Understanding**
   - Análisis de intención
   - Extracción de entidades de la query
   - Detección de temporalidad
   - Expansión de queries

### 🏗️ Arquitectura

#### Aggregates

- **`SearchQuery`** (Aggregate Root)
  - Query del usuario
  - Filtros aplicados
  - Resultados obtenidos
  - Metadata de búsqueda

#### Entities

- **`SearchResult`**
  - Chunk recuperado
  - Score de relevancia
  - Explicación del score
  - Metadata

#### Value Objects

- **`QueryIntent`** - Intención de la query
- **`RelevanceScore`** - Score de relevancia (0-1)
- **`TemporalFilter`** - Filtro temporal
- **`EntityFilter`** - Filtro por entidad
- **`SearchMetrics`** - Métricas de búsqueda

#### Domain Services

- **`SemanticSearchService`** - Búsqueda semántica
- **`HybridSearchService`** - Búsqueda híbrida
- **`ReRankingService`** - Re-ranking de resultados
- **`QueryAnalyzer`** - Análisis de queries
- **`ResultFusionService`** - Fusión de resultados

### 🔗 Integraciones

#### Input

- **Embedding & Indexing Context**
  - Consume: Embeddings indexados
  - Via: Vector DB queries

- **Signals & Analytics Context** (opcional)
  - Consume: Signals para re-ranking
  - Via: Read repositories

#### Output

- **RAG Assistant Context**
  - Produce: Documentos rankeados
  - Via: Domain services

### 🛠️ Stack Técnico

#### Search

- **Vector Search**: Qdrant/Pinecone native
- **Keyword Search**: BM25 (Elasticsearch o custom)
- **Hybrid**: Reciprocal Rank Fusion (RRF)

#### Re-Ranking

- **Cohere Rerank API** (cloud)
- **Cross-Encoder models** (local)
- **Custom scoring** (signals-based)

#### Query Analysis

- **LLM-based** (GPT-4o-mini)
- **Rule-based** (regex + NER)

### 📋 Tareas Principales

#### 1. Domain Layer (1.5 semanas)

- [ ] Definir aggregates y entities
- [ ] Implementar value objects
- [ ] Crear domain services
- [ ] Definir interfaces
- [ ] Tests unitarios

#### 2. Application Layer (1 semana)

- [ ] Queries: SemanticSearch, HybridSearch
- [ ] Commands: SaveSearchQuery
- [ ] Query handlers
- [ ] Tests

#### 3. Infrastructure Layer (2 semanas)

- [ ] Vector search implementation
- [ ] Keyword search implementation
- [ ] Hybrid search implementation
- [ ] Re-ranking implementations
- [ ] Query analyzer implementations
- [ ] Tests de integración

#### 4. API Layer (0.5 semanas)

- [ ] CLI commands
- [ ] HTTP endpoints
- [ ] Tests e2e

### 🎯 Entregables

1. **Bounded Context Completo**
2. **Search Configurations**
   - Configuración de índices
   - Configuración de re-rankers
   - Configuración de filtros

3. **CLI Commands**
   ```bash
   npm run cli search:semantic --query "bitcoin trends"
   npm run cli search:hybrid --query "ethereum price" --date-range "last-week"
   npm run cli search:filter --entity "BTC" --source "twitter"
   ```

### ✅ Criterios de Éxito

- [ ] Búsqueda semántica <100ms
- [ ] Precision@5 >70%
- [ ] Recall@10 >80%
- [ ] Re-ranking mejora relevancia >20%
- [ ] Filtros funcionan correctamente
- [ ] Cobertura de tests >80%

---

## Fase 4: RAG Assistant Context

### 📅 Timeline: 5-6 semanas

### 🎯 Objetivo

Implementar chatbot conversacional con RAG que responde preguntas sobre crypto con citaciones de fuentes.

### 📦 Responsabilidades

#### Core Responsibilities

1. **Conversation Management**
   - Crear y gestionar sesiones
   - Persistir historial
   - Mantener contexto multi-turno
   - Gestionar referencias anafóricas

2. **RAG Orchestration**
   - Coordinar retrieval
   - Construir contexto para LLM
   - Generar respuestas
   - Incluir citaciones

3. **Query Understanding**
   - Reformular queries con historial
   - Extraer intención
   - Identificar entidades y temporalidad

4. **Response Generation**
   - Generar respuestas contextualizadas
   - Formatear con citaciones
   - Controlar longitud y detalle
   - Streaming de respuestas

5. **Conversational Memory**
   - Short-term (sesión actual)
   - Long-term (preferencias)
   - Checkpointing

### 🏗️ Arquitectura

#### Aggregates

- **`Conversation`** (Aggregate Root)
  - Sesión conversacional
  - Colección de mensajes
  - Estado de la conversación
  - Metadata

#### Entities

- **`Message`**
  - Mensaje individual
  - Role (user/assistant/system)
  - Contenido
  - Citaciones
  - Timestamp

#### Value Objects

- **`ConversationId`** - ID único de conversación
- **`MessageRole`** - Role del mensaje
- **`QueryIntent`** - Intención de la query
- **`SourceCitation`** - Citación de fuente
- **`ConversationStatus`** - Estado (active, ended)

#### Domain Services

- **`QueryUnderstandingService`** - Análisis de queries
- **`ContextBuilderService`** - Construcción de contexto
- **`ResponseFormatterService`** - Formateo de respuestas
- **`ConversationMemoryService`** - Gestión de memoria

### 🔗 Integraciones

#### Input

- **Knowledge Retrieval Context**
  - Consume: Documentos rankeados
  - Via: Domain services

#### Output

- **CLI/API**
  - Produce: Respuestas conversacionales
  - Via: Controllers

### 🛠️ Stack Técnico

#### LLM Orchestration

- **LangChain** - Framework principal
- **LangGraph** - State management
- **LangSmith** - Observability

#### LLM Providers

- **OpenAI** - GPT-4o, GPT-4o-mini
- **Anthropic** - Claude 3.5 Sonnet
- **Ollama** - Llama 3, Mistral (local)

#### Memory

- **Redis** - Short-term memory
- **PostgreSQL** - Long-term persistence

#### CLI

- **Commander** - CLI framework
- **Ink** - Interactive UI (opcional)

### 📋 Tareas Principales

#### 1. Domain Layer (2 semanas)

- [ ] Definir aggregates y entities
- [ ] Implementar value objects
- [ ] Crear domain services
- [ ] Definir interfaces (LLM, Memory, Retrieval)
- [ ] Implementar domain events
- [ ] Tests unitarios

#### 2. Application Layer (1.5 semanas)

- [ ] Commands: StartConversation, SendMessage, EndConversation
- [ ] Queries: GetConversationHistory, GetActiveConversations
- [ ] Event handlers
- [ ] RAG pipeline orchestration
- [ ] Tests

#### 3. Infrastructure Layer (2 semanas)

- [ ] LLM provider implementations
- [ ] Memory implementations (Redis)
- [ ] Repository implementations
- [ ] Retrieval adapter
- [ ] LangChain integration
- [ ] Tests de integración

#### 4. API Layer (1 semana)

- [ ] CLI interactive chat
- [ ] CLI single query
- [ ] HTTP endpoints
- [ ] WebSocket (streaming)
- [ ] Tests e2e

### 🎯 Entregables

1. **Bounded Context Completo**
2. **LangChain Integration**
   - RAG chains
   - History-aware retriever
   - Prompt templates

3. **CLI Commands**

   ```bash
   # Interactive chat
   npm run cli chat:start

   # Single query
   npm run cli chat:ask "What happened with Bitcoin this week?"

   # History
   npm run cli chat:history
   npm run cli chat:export --format json
   ```

4. **HTTP API**
   ```
   POST /api/conversations
   POST /api/conversations/:id/messages
   GET /api/conversations/:id
   GET /api/conversations/:id/messages
   ```

### ✅ Criterios de Éxito

- [ ] Responde queries con contexto conversacional
- [ ] Incluye citaciones de fuentes
- [ ] Latencia <3s por respuesta
- [ ] Streaming funciona correctamente
- [ ] Memoria conversacional persiste
- [ ] CLI interactivo funcional
- [ ] API HTTP funcional
- [ ] Cobertura de tests >80%

---

## Fase 5: Signals & Analytics Context (Opcional)

### 📅 Timeline: 3-4 semanas

### 🎯 Objetivo

Detectar tendencias, calcular relevancia dinámica y generar signals para mejorar el re-ranking.

### 📦 Responsabilidades

#### Core Responsibilities

1. **Trend Detection**
   - Detectar tendencias emergentes
   - Calcular velocidad de cambio
   - Identificar picos de actividad

2. **Signal Generation**
   - Volumen de menciones
   - Cambios abruptos
   - Autoridad de fuente
   - Recencia

3. **Relevance Scoring**
   - Scoring dinámico
   - Agregación temporal
   - Scoring por activo

4. **Analytics**
   - Métricas agregadas
   - Reportes
   - Visualizaciones (opcional)

### 🏗️ Arquitectura

#### Aggregates

- **`Signal`** (Aggregate Root)
- **`TrendAnalysis`**

#### Value Objects

- **`SignalType`**
- **`SignalStrength`**
- **`TrendDirection`**

#### Domain Services

- **`TrendDetectionService`**
- **`SignalAggregationService`**
- **`RelevanceScoringService`**

### 🔗 Integraciones

#### Input

- **Content Ingestion Context** - Contenido nuevo
- **Document Processing Context** - Chunks procesados

#### Output

- **Knowledge Retrieval Context** - Signals para re-ranking

### ✅ Criterios de Éxito

- [ ] Detecta tendencias en tiempo real
- [ ] Genera signals útiles para re-ranking
- [ ] Mejora relevancia de búsqueda >15%

---

## Fase 6: Identity & Configuration Context (Opcional)

### 📅 Timeline: 2-3 semanas

### 🎯 Objetivo

Gestionar configuración, API keys, perfiles de usuario y feature flags.

### 📦 Responsabilidades

1. **Configuration Management**
2. **API Key Management**
3. **User Profiles**
4. **Feature Flags**
5. **Authentication** (para API)

---

## Resumen del Roadmap

### Timeline Total: 18-24 semanas (4.5-6 meses)

```
Mes 1-1.5: Document Processing
Mes 2-2.5: Embedding & Indexing
Mes 3-4: Knowledge Retrieval
Mes 4.5-6: RAG Assistant
Mes 6+ (Opcional): Signals & Analytics, Identity & Configuration
```

### Dependencias Críticas

```
Content Ingestion (✅ Implementado)
    ↓
Document Processing (Fase 1)
    ↓
Embedding & Indexing (Fase 2)
    ↓
Knowledge Retrieval (Fase 3)
    ↓
RAG Assistant (Fase 4)
    ↓
Signals & Analytics (Fase 5 - Opcional)
Identity & Configuration (Fase 6 - Opcional)
```

### Hitos Clave

- **Hito 1** (Semana 6): Document Processing funcional
- **Hito 2** (Semana 10): Embeddings indexados y buscables
- **Hito 3** (Semana 15): Búsqueda semántica con re-ranking
- **Hito 4** (Semana 21): Chatbot RAG funcional (MVP)
- **Hito 5** (Semana 24+): Sistema completo con analytics

### Recursos Necesarios

#### Desarrollo

- 1 desarrollador full-time
- Conocimientos: TypeScript, NestJS, DDD, LangChain, Vector DBs

#### Infraestructura

- PostgreSQL (metadata)
- Redis (cache/memory)
- Vector DB (Qdrant/Pinecone)
- LLM API (OpenAI/Anthropic)
- Embedding API (OpenAI/Cohere)

#### Costos Estimados (Mensual)

- LLM API: $50-200
- Embedding API: $20-100
- Vector DB: $0-100 (Qdrant local vs Pinecone)
- Hosting: $50-200
- **Total**: $120-600/mes

---

## Estrategias de Implementación

### Opción A: Secuencial (Recomendada)

Implementar cada fase en orden, sin mocks.

**Pros**:

- ✅ Arquitectura sólida
- ✅ Sin deuda técnica
- ✅ Tests reales

**Contras**:

- ⚠️ Más tiempo hasta MVP
- ⚠️ Requiere paciencia

### Opción B: Fast-Track con Mocks

Saltar a RAG Assistant (Fase 4) mockeando Fases 1-3.

**Pros**:

- ✅ MVP rápido (6-8 semanas)
- ✅ Validación temprana

**Contras**:

- ⚠️ Deuda técnica
- ⚠️ Refactoring después
- ⚠️ Tests menos confiables

### Opción C: Híbrida

Implementar Fase 1 (Document Processing) + Fase 4 (RAG Assistant) con mocks para Fases 2-3.

**Pros**:

- ✅ Balance entre velocidad y calidad
- ✅ Fundación sólida (chunking)
- ✅ MVP en 10-12 semanas

**Contras**:

- ⚠️ Algo de deuda técnica
- ⚠️ Refactoring parcial

---

## Recomendación Final

### Para MVP Rápido (2-3 meses)

**Opción C: Híbrida**

1. Implementar Document Processing (Fase 1)
2. Implementar RAG Assistant (Fase 4) con mocks
3. Backfill Embedding & Indexing (Fase 2)
4. Backfill Knowledge Retrieval (Fase 3)

### Para Arquitectura Sólida (4-6 meses)

**Opción A: Secuencial**

1. Document Processing
2. Embedding & Indexing
3. Knowledge Retrieval
4. RAG Assistant
5. Signals & Analytics (opcional)

---

## Próximos Pasos

1. **Decidir estrategia**: Secuencial vs Fast-Track vs Híbrida
2. **Crear primer spec**: Document Processing o RAG Assistant
3. **Setup de infraestructura**: PostgreSQL, Redis, Vector DB
4. **Comenzar implementación**

---

## Apéndice: Bounded Context Names

### Nombres Finales Propuestos

| Bounded Context          | Nombre Propuesto      | Alternativas                                |
| ------------------------ | --------------------- | ------------------------------------------- |
| Refinement               | `refinement`          | `content-refinement`, `enrichment`          |
| Embedding & Indexing     | `embedding-indexing`  | `vectorization`, `indexing`                 |
| Knowledge Retrieval      | `knowledge-retrieval` | `search`, `retrieval`                       |
| RAG Assistant            | `rag-assistant`       | `conversational-rag`, `knowledge-assistant` |
| Signals & Analytics      | `signals-analytics`   | `analytics`, `trends`                       |
| Identity & Configuration | `identity-config`     | `configuration`, `settings`                 |

### Justificación de Nombres

- **`refinement`**: Refina contenido crudo (forma, significado, calidad). Ver `docs/refinement/00-WHY-REFINEMENT.md`
- **`embedding-indexing`**: Combina las dos responsabilidades principales
- **`knowledge-retrieval`**: Enfocado en recuperación de conocimiento
- **`rag-assistant`**: Específico, indica RAG + asistente conversacional
- **`signals-analytics`**: Combina detección de señales y analytics
- **`identity-config`**: Combina identidad y configuración

---

**Documento creado**: 2025-01-08
**Versión**: 1.0
**Autor**: Kiro AI Assistant
