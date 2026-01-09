# Document Processing - Responsabilidades del Contexto

## Responsabilidades Core

### 1. Chunking Semántico

**Descripción**: Dividir documentos en fragmentos semánticamente coherentes.

**Responsabilidades Específicas**:

- ✅ Dividir contenido respetando límites semánticos (párrafos, oraciones)
- ✅ Mantener tamaño óptimo de chunks (500-1000 tokens)
- ✅ Aplicar overlap inteligente (100-200 tokens)
- ✅ Preservar contexto en los límites
- ✅ Soportar múltiples estrategias (texto, markdown, código)

**Estrategias Soportadas**:

1. **Recursive Character Splitting** - Texto general
2. **Markdown Splitting** - Contenido markdown
3. **Code Splitting** - Código fuente
4. **Semantic Splitting** - Basado en embeddings (futuro)

**Configuración**:

```typescript
interface ChunkingConfig {
  strategy: 'recursive' | 'markdown' | 'code' | 'semantic';
  chunkSize: number; // 500-1000 tokens
  chunkOverlap: number; // 100-200 tokens
  preserveSentences: boolean;
  preserveParagraphs: boolean;
}
```

**Métricas de Éxito**:

- Coherencia semántica >90%
- Preservación de contexto >95%
- Chunks por documento: 5-20 (promedio)

---

### 2. Enriquecimiento de Contenido

**Descripción**: Extraer metadata y entidades relevantes de cada chunk.

**Responsabilidades Específicas**:

#### 2.1 Extracción de Entidades Crypto

- ✅ Identificar tokens (BTC, ETH, USDT, etc.)
- ✅ Identificar exchanges (Binance, Coinbase, etc.)
- ✅ Identificar blockchains (Ethereum, Solana, etc.)
- ✅ Identificar protocolos DeFi (Uniswap, Aave, etc.)
- ✅ Identificar eventos (halving, fork, upgrade, etc.)

**Métodos de Extracción**:

1. **Regex Patterns** (80% de casos)
   - Rápido y preciso
   - Patrones conocidos
2. **Dictionary Matching** (15% de casos)
   - Diccionario de entidades conocidas
   - Fuzzy matching
3. **LLM Extraction** (5% de casos)
   - Casos complejos
   - Entidades nuevas

**Ejemplo de Entidades**:

```typescript
interface CryptoEntity {
  type: 'token' | 'exchange' | 'blockchain' | 'protocol' | 'event';
  value: string;
  confidence: number; // 0-1
  position: {
    start: number;
    end: number;
  };
}
```

#### 2.2 Análisis Temporal

- ✅ Extraer fechas mencionadas
- ✅ Identificar ventanas temporales
- ✅ Distinguir entre fecha de publicación y fecha del evento
- ✅ Detectar referencias temporales relativas ("ayer", "la semana pasada")

**Ejemplo de Contexto Temporal**:

```typescript
interface TemporalContext {
  publishedAt: Date;
  eventTimestamp?: Date;
  temporalWindow?: {
    start: Date;
    end: Date;
  };
  relativeReferences: string[]; // ["yesterday", "last week"]
}
```

#### 2.3 Clasificación de Contenido

- ✅ Tipo: noticia, análisis, tutorial, opinión, reporte
- ✅ Sentimiento: positivo, negativo, neutral
- ✅ Complejidad: básico, intermedio, avanzado
- ✅ Audiencia: principiante, trader, desarrollador

---

### 3. Generación de Metadata

**Descripción**: Generar metadata estructurada para cada chunk.

**Responsabilidades Específicas**:

#### 3.1 Hashes Únicos

- ✅ Generar hash SHA-256 del contenido
- ✅ Detectar duplicados
- ✅ Versionado de chunks

```typescript
interface ChunkHash {
  value: string; // SHA-256 hash
  algorithm: 'sha256';
  createdAt: Date;
}
```

#### 3.2 Posición y Contexto

- ✅ Posición en el documento original
- ✅ Chunk anterior y siguiente
- ✅ Índice del chunk
- ✅ Contexto del documento padre

```typescript
interface ChunkPosition {
  index: number;
  startOffset: number;
  endOffset: number;
  previousChunkId?: string;
  nextChunkId?: string;
  documentId: string;
}
```

#### 3.3 Relaciones

- ✅ Relación con documento original
- ✅ Relación con otros chunks
- ✅ Referencias cruzadas
- ✅ Citas y menciones

---

### 4. Validación de Calidad

**Descripción**: Validar y puntuar la calidad del contenido.

**Responsabilidades Específicas**:

#### 4.1 Scoring de Calidad

- ✅ Longitud adecuada (>100 caracteres)
- ✅ Coherencia semántica
- ✅ Relevancia crypto (presencia de entidades)
- ✅ Calidad de la fuente
- ✅ Frescura temporal

```typescript
interface QualityScore {
  overall: number; // 0-1
  length: number; // 0-1
  coherence: number; // 0-1
  relevance: number; // 0-1
  sourceQuality: number; // 0-1
  freshness: number; // 0-1
}
```

#### 4.2 Detección de Spam

- ✅ Ratio de enlaces >30% → Spam
- ✅ Palabras repetidas >50% → Spam
- ✅ Contenido promocional → Filtrado
- ✅ Contenido duplicado → Rechazado

#### 4.3 Filtrado de Contenido Irrelevante

- ✅ Sin entidades crypto → Baja prioridad
- ✅ Sin contexto temporal → Baja prioridad
- ✅ Contenido genérico → Filtrado
- ✅ Contenido de baja calidad → Rechazado

**Umbrales de Calidad**:

```typescript
const QUALITY_THRESHOLDS = {
  minimum: 0.3, // Rechazar si <0.3
  lowPriority: 0.5, // Baja prioridad si <0.5
  highPriority: 0.7, // Alta prioridad si >0.7
};
```

---

### 5. Versionado y Actualización

**Descripción**: Gestionar versiones de documentos procesados.

**Responsabilidades Específicas**:

- ✅ Versionar documentos procesados
- ✅ Rastrear cambios en el procesamiento
- ✅ Soportar re-procesamiento
- ✅ Mantener historial de versiones

```typescript
interface DocumentVersion {
  version: number;
  processedAt: Date;
  processingStrategy: string;
  previousVersion?: string;
  changeReason: string;
  changes: {
    chunksAdded: number;
    chunksRemoved: number;
    chunksModified: number;
  };
}
```

---

### 6. Batch Processing

**Descripción**: Procesar múltiples documentos eficientemente.

**Responsabilidades Específicas**:

- ✅ Procesamiento en lotes (batch)
- ✅ Procesamiento paralelo
- ✅ Retry automático en errores
- ✅ Progress tracking

```typescript
interface BatchProcessingConfig {
  batchSize: number; // 100 documentos
  maxConcurrency: number; // 4 workers
  retryAttempts: number; // 3 intentos
  retryDelay: number; // 1000ms
}
```

---

## Responsabilidades Fuera del Alcance

### ❌ NO es Responsabilidad de Este Contexto

1. **Ingesta de Contenido**
   - Responsabilidad: Content Ingestion Context
   - Ya implementado

2. **Generación de Embeddings**
   - Responsabilidad: Embedding & Indexing Context
   - Fase posterior

3. **Búsqueda Semántica**
   - Responsabilidad: Knowledge Retrieval Context
   - Fase posterior

4. **Generación de Respuestas**
   - Responsabilidad: RAG Assistant Context
   - Fase posterior

5. **Análisis de Tendencias**
   - Responsabilidad: Signals & Analytics Context
   - Fase opcional

---

## Matriz de Responsabilidades

| Responsabilidad         | Prioridad | Complejidad | Impacto |
| ----------------------- | --------- | ----------- | ------- |
| Chunking Semántico      | Alta      | Media       | Alto    |
| Extracción de Entidades | Alta      | Alta        | Alto    |
| Análisis Temporal       | Media     | Media       | Medio   |
| Scoring de Calidad      | Alta      | Media       | Alto    |
| Detección de Spam       | Media     | Baja        | Medio   |
| Versionado              | Baja      | Baja        | Bajo    |
| Batch Processing        | Alta      | Media       | Alto    |

---

## Flujo de Responsabilidades

```
1. Recibir ContentItem
   ↓
2. Validar Calidad Mínima
   ↓ (si pasa)
3. Chunking Semántico
   ↓
4. Para cada Chunk:
   ├─ Extraer Entidades Crypto
   ├─ Analizar Contexto Temporal
   ├─ Calcular Quality Score
   ├─ Generar Hash
   └─ Generar Metadata
   ↓
5. Crear ProcessedDocument Aggregate
   ↓
6. Persistir en Database
   ↓
7. Publicar DocumentProcessedEvent
```

---

**Documento anterior**: [04-tech-stack.md](./04-tech-stack.md)
**Siguiente documento**: [06-bounded-context.md](./06-bounded-context.md)
