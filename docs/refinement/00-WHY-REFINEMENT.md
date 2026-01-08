# Por Qué "Refinement" en Lugar de "Document Processing"

## Decisión de Naming

**Nombre Elegido**: `refinement`
**Nombre Anterior**: `document-processing`

---

## Justificación

### 1. Lenguaje Ubicuo (Ubiquitous Language)

**Refinement** es un término natural en conversaciones de dominio:

✅ **Conversaciones Naturales**:

- "Este contenido ya pasó por Refinement"
- "Refinement produce Chunks listos para indexación"
- "Falló el Refinement por baja calidad"
- "El output de Refinement entra a Embedding"

❌ **Conversaciones con "Document Processing"**:

- "Este contenido ya pasó por document-processing" (técnico, no natural)
- "Document processing produce chunks" (verboso)
- "Falló el document processing" (genérico)

### 2. Agnóstico de Implementación

**Refinement** no presupone:

- ✅ Tipo de contenido (documentos, tweets, videos, audio)
- ✅ Tecnología (IA, NLP, regex, manual)
- ✅ Método (chunking, splitting, parsing)

**Document Processing** presupone:

- ❌ Solo documentos (¿qué pasa con tweets, videos?)
- ❌ Procesamiento técnico (muy genérico)

### 3. Refleja la Esencia del Dominio

**Refinement** implica:

- ✅ Mejora de calidad (no solo transformación)
- ✅ Refinamiento de forma (chunking)
- ✅ Refinamiento de significado (enrichment)
- ✅ Refinamiento de calidad (validation)
- ✅ Proceso de mejora continua

**Document Processing** implica:

- ❌ Solo transformación técnica
- ❌ No comunica mejora de calidad
- ❌ Demasiado genérico

### 4. Eventos Más Claros

**Refinement Events**:

```typescript
RefinementStartedEvent;
RefinementCompletedEvent;
RefinementRejectedEvent;
RefinementFailedEvent;
ChunkRefinedEvent;
```

**Document Processing Events**:

```typescript
DocumentProcessedEvent; // ¿Qué tipo de procesamiento?
DocumentProcessingFailedEvent; // Verboso
ChunkCreatedEvent; // No comunica refinamiento
```

### 5. Métricas Naturales

**Refinement Metrics**:

```typescript
refinement_quality_score; // Claro: calidad del refinamiento
refinement_precision; // Claro: precisión del refinamiento
refinement_throughput; // Claro: velocidad de refinamiento
refinement_rejection_rate; // Claro: tasa de rechazo
```

**Document Processing Metrics**:

```typescript
processing_quality_score; // Ambiguo: ¿qué procesamiento?
processing_precision; // Genérico
document_processing_throughput; // Verboso
```

### 6. Bounded Context Claro

**Con Refinement**:

```
Content Ingestion (contenido crudo)
    ↓
REFINEMENT (contenido refinado)
    ↓
Embedding & Indexing (vectores)
```

**Con Document Processing**:

```
Content Ingestion (contenido crudo)
    ↓
DOCUMENT PROCESSING (¿documentos? ¿procesamiento?)
    ↓
Embedding & Indexing (vectores)
```

### 7. Acepta Métricas de Calidad Naturalmente

**Refinement** implica calidad:

- ✅ `refinement_quality_score` - Natural
- ✅ `refinement_precision` - Natural
- ✅ `refinement_recall` - Natural
- ✅ `refinement_rejection_rate` - Natural

**Document Processing** no implica calidad:

- ❌ `processing_quality_score` - ¿Calidad de qué?
- ❌ `processing_precision` - Ambiguo

### 8. Paso Previo Obligatorio

**Refinement** comunica que es un paso esencial:

- ✅ "Refinement es prerequisito para indexación"
- ✅ "Sin Refinement, no hay embeddings"
- ✅ "Refinement garantiza calidad"

**Document Processing** no comunica obligatoriedad:

- ❌ "Processing es prerequisito" - ¿Qué tipo?
- ❌ "Sin processing" - Demasiado genérico

---

## Comparación Directa

| Aspecto                | Refinement | Document Processing |
| ---------------------- | ---------- | ------------------- |
| **Lenguaje Ubicuo**    | ✅ Natural | ❌ Técnico          |
| **Agnóstico**          | ✅ Sí      | ❌ Asume documentos |
| **Implica Calidad**    | ✅ Sí      | ❌ No               |
| **Eventos Claros**     | ✅ Sí      | ❌ Verbosos         |
| **Métricas Naturales** | ✅ Sí      | ❌ Ambiguas         |
| **Conversaciones**     | ✅ Fluidas | ❌ Técnicas         |
| **Extensibilidad**     | ✅ Alta    | ❌ Media            |

---

## Terminología Actualizada

### Aggregates

| Antes               | Después          | Razón                              |
| ------------------- | ---------------- | ---------------------------------- |
| `ProcessedDocument` | `RefinedContent` | Más genérico, no asume "documento" |
| `DocumentChunk`     | `RefinedChunk`   | Consistente con el contexto        |

### Events

| Antes                           | Después                    | Razón                 |
| ------------------------------- | -------------------------- | --------------------- |
| `DocumentProcessedEvent`        | `RefinementCompletedEvent` | Más claro y conciso   |
| `DocumentProcessingFailedEvent` | `RefinementFailedEvent`    | Más conciso           |
| `ChunkCreatedEvent`             | `ChunkRefinedEvent`        | Comunica refinamiento |

### Value Objects

| Antes              | Después            | Razón       |
| ------------------ | ------------------ | ----------- |
| `ProcessingStatus` | `RefinementStatus` | Consistente |
| `ProcessingConfig` | `RefinementConfig` | Consistente |
| `ProcessingError`  | `RefinementError`  | Consistente |

### Commands

| Antes                      | Después                  | Razón       |
| -------------------------- | ------------------------ | ----------- |
| `ProcessDocumentCommand`   | `RefineContentCommand`   | Más claro   |
| `ReprocessDocumentCommand` | `RerefineContentCommand` | Consistente |

### Queries

| Antes                       | Después                   | Razón        |
| --------------------------- | ------------------------- | ------------ |
| `GetProcessedDocumentQuery` | `GetRefinedContentQuery`  | Consistente  |
| `GetChunksByDocumentQuery`  | `GetChunksByContentQuery` | Más genérico |

---

## Ejemplos de Uso

### Conversaciones de Dominio

**Con Refinement**:

```
PM: "¿Cuánto contenido pasó por Refinement hoy?"
Dev: "1,500 items. Refinement rechazó 200 por baja calidad."
PM: "¿Cuál es el refinement quality score promedio?"
Dev: "0.82, arriba del threshold de 0.7."
```

**Con Document Processing**:

```
PM: "¿Cuántos documentos se procesaron hoy?"
Dev: "1,500. El processing rechazó 200."
PM: "¿Cuál es el processing quality score?"
Dev: "0.82." (¿Processing de qué? ¿Calidad de qué?)
```

### Código

**Con Refinement**:

```typescript
// Claro y conciso
const refinedContent = await refine(rawContent);
if (refinedContent.qualityScore < 0.7) {
  throw new RefinementRejectedError('Low quality');
}
await publishEvent(new RefinementCompletedEvent(refinedContent.id));
```

**Con Document Processing**:

```typescript
// Verboso y ambiguo
const processedDocument = await processDocument(rawContent);
if (processedDocument.qualityScore < 0.7) {
  throw new DocumentProcessingError('Low quality');
}
await publishEvent(new DocumentProcessedEvent(processedDocument.id));
```

### Métricas

**Con Refinement**:

```
refinement_quality_score{p50} 0.82
refinement_precision 0.88
refinement_recall 0.91
refinement_throughput_items_per_minute 120
refinement_rejection_rate 0.13
```

**Con Document Processing**:

```
processing_quality_score{p50} 0.82  // ¿Qué procesamiento?
processing_precision 0.88            // Ambiguo
document_processing_throughput 120   // Verboso
```

---

## Conclusión

**Refinement** es superior a "Document Processing" porque:

1. ✅ Es lenguaje ubicuo natural
2. ✅ Es agnóstico de implementación
3. ✅ Refleja la esencia del dominio (mejora de calidad)
4. ✅ Produce eventos más claros
5. ✅ Acepta métricas naturalmente
6. ✅ Facilita conversaciones de dominio
7. ✅ Es extensible y flexible
8. ✅ Comunica obligatoriedad y calidad

**Decisión**: Usar `refinement` como nombre del bounded context.

---

**Creado**: 2025-01-08
**Versión**: 1.0
**Autor**: Equipo de Arquitectura
