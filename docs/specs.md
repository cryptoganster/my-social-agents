## 1. Objetivo del sistema

- Plataforma personal basada en criptomonedas
- Operación principal vía CLI
- Exposición de capacidades vía API (headless)
- Ingesta, procesamiento, indexación y recuperación de información
- Chatbot orientado a consultas temporales y semánticas sobre crypto
- Arquitectura modular, desacoplada y extensible

---

## 2. Principios arquitectónicos

- Clean Architecture estricta
- Domain Driven Design (DDD)
- Separación por Bounded Contexts
- CLI como cliente principal
- API como interfaz secundaria (para automatizaciones)
- Infraestructura intercambiable (LLMs, embeddings, storage, rerankers)
- Diseño event-driven cuando aplique
- Sin dependencias de frontend web

---

## 3. Stack tecnológico

- NestJS (monorepo)
- TypeScript
- Node.js
- CLI basada en Commander / Oclif / Ink
- Vector DB (pluggable)
- Relational DB / KV para metadata
- LLM provider (pluggable)
- Embeddings provider (pluggable)
- Reranking provider (pluggable)

---

## 4. Estructura de monorepo

- `apps/`
  - `backend/`
  - `cli/`

- `src/modules/<bounded-context>/`
  - `domain/`
  - `app/`
  - `infra/`
  - `api/`

---

## 5. Bounded Contexts

### 5.1 Content Ingestion Context

- Responsabilidad
  - Ingestar contenido desde múltiples fuentes

- Fuentes soportadas
  - Web scraping
  - RSS / Atom feeds
  - Redes sociales (read-only)
  - APIs públicas
  - PDFs
  - Imágenes (OCR)
  - Wikipedia
  - Raw text

- Normalización de contenido
- Extracción de metadata
  - Fuente
  - Autor
  - Timestamp
  - Lenguaje
  - Tipo de contenido
  - Relevancia inicial

- Versionado de documentos
- Deduplicación de contenido
- Control de frecuencia de ingesta
- Manejo de errores por fuente

---

### 5.2 Document Processing Context

- Chunking semántico
- Chunking por ventana temporal
- Chunking configurable
- Preservación de contexto entre chunks
- Enriquecimiento de chunks
  - Entidades cripto
  - Tokens
  - Blockchains
  - Exchanges
  - Eventos relevantes

- Identificación de temporalidad
- Generación de hashes de chunks

---

### 5.3 Embedding & Indexing Context

- Generación de embeddings
- Versionado de embeddings
- Soporte para múltiples modelos
- Almacenamiento en vector DB
- Indexación incremental
- Eliminación y reindexación
- Asociación chunk ↔ embedding
- Métricas de calidad del embedding

---

### 5.4 Retrieval & Re-Ranking Context

- Búsqueda semántica
- Búsqueda híbrida (keyword + vector)
- Filtros por:
  - Tiempo
  - Fuente
  - Token / blockchain

- Re-ranking basado en signals
  - Recencia
  - Autoridad de la fuente
  - Frecuencia de mención
  - Relevancia histórica
  - Tendencia temporal

- Re-ranking pluggable
- Scoring explicable

---

### 5.5 Knowledge Query / Chat Context

- Chatbot orientado a crypto
- Queries naturales en lenguaje humano
- Soporte a preguntas temporales
- Soporte a preguntas comparativas
- Soporte a resúmenes
- Contexto conversacional persistente
- Prompting basado en retrieved context
- Respuestas citadas (source attribution)
- Control de longitud y detalle
- Soporte multi-idioma

---

### 5.6 Signals & Analytics Context

- Detección de tendencias
- Agregación temporal
- Señales de volumen de menciones
- Señales de cambio abrupto
- Señales por activo
- Señales por fuente
- Cálculo de relevancia dinámica
- Persistencia de signals

---

### 5.7 Identity & Configuration Context

- Configuración local por usuario
- Configuración por entorno
- Gestión de API keys
- Profiles de ejecución
- Feature flags
- Permisos CLI
- Autenticación para API

---

## 6. CLI Context

- Comandos de ingesta
- Comandos de procesamiento
- Comandos de indexación
- Comandos de consulta
- Comandos de chat
- Comandos de mantenimiento
- Modo interactivo
- Modo batch
- Output en:
  - Texto
  - JSON
  - Markdown

- Flags para filtros temporales
- Flags para tokens específicos
- Flags para fuentes

---

## 7. API Context

- API REST / GraphQL / RPC (pluggable)
- Endpoints headless
- Autenticación por token
- Rate limiting
- Observabilidad
- Versionado de API

---

## 8. Dominio (estructura por bounded context)

- `domain/`
  - `aggregates/`
    - Document
    - Chunk
    - Embedding
    - Signal
    - Query

  - `entities/`
    - Source
    - Asset
    - TimeWindow

  - `value-objects/`
    - ContentHash
    - Timestamp
    - RelevanceScore
    - SourceType

  - `interfaces/`
    - Repositories
    - Providers
    - Gateways

  - `read-models/`
    - SearchResult
    - ChatAnswer

  - `services/`
    - ChunkingService
    - RetrievalService
    - RerankingService
    - SignalService

---

## 9. Application Layer (`app/`)

- Use cases explícitos
- Orquestación de flujos
- Validación de input
- Control transaccional
- Publicación de eventos
- No dependencia de infraestructura

---

## 10. Infrastructure Layer (`infra/`)

- Implementaciones de scraping
- Implementaciones de OCR
- Implementaciones de DB
- Implementaciones de Vector DB
- Implementaciones de LLM
- Implementaciones de embeddings
- Implementaciones de reranking
- Caching
- Logging
- Tracing

---

## 11. API Layer (`api/`)

- Controllers
- DTOs
- Serializers
- Guards
- Interceptors
- Mappers dominio ↔ transporte

---

## 12. Observabilidad & Operación

- Logging estructurado
- Métricas
- Health checks
- Trazabilidad por request
- Debug CLI
- Dry-run mode

---

## 13. Seguridad

- Aislamiento de secretos
- Sanitización de inputs
- Protección contra prompt injection
- Control de fuentes no confiables
- Rate limiting por CLI / API

---

## 14. Testing

- Unit tests por dominio
- Tests de use cases
- Tests de infraestructura
- Tests de CLI
- Tests de regresión semántica
- Golden tests para respuestas

---

## 15. No objetivos (Out of Scope)

- UI web
- Trading automatizado
- Custodia de activos
- Ejecución de transacciones on-chain
- Recomendaciones financieras

---
