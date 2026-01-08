# Decisión de Naming: Refinement

## Resumen Ejecutivo

**Decisión**: Renombrar el bounded context de `document-processing` a `refinement`
**Fecha**: 2025-01-08
**Estado**: ✅ Aprobado
**Impacto**: Alto (naming, terminología, eventos, métricas)

---

## Contexto

Durante la planificación del segundo bounded context del sistema (después de Content Ingestion), se identificó que el nombre "document-processing" tenía varias limitaciones:

1. Demasiado técnico y genérico
2. Asume "documentos" (no aplica a tweets, videos, etc.)
3. No comunica mejora de calidad
4. No es lenguaje ubicuo natural

---

## Decisión

**Nombre Elegido**: `refinement`

### Significado en el Dominio

"Tomar contenido crudo y refinarlo hasta que sea útil y significativo"

### Por Qué Encaja Perfectamente

1. **Implica mejora de calidad**, no solo transformación
2. **Natural en conversaciones de dominio**:
   - "Este contenido ya pasó por Refinement"
   - "Refinement produce Chunks listos"
   - "Falló el Refinement por baja calidad"

3. **No menciona IA, NLP ni chunking** (agnóstico de implementación)
4. **Encaja como paso previo obligatorio**
5. **Tu contexto mejora calidad**, no solo transforma:
   - chunking → refinar forma
   - enrichment → refinar significado
   - validation → refinar calidad

6. **Acepta métricas naturalmente**:
   - `refinement_quality_score`
   - `refinement_precision`

7. **No presupone documentos, texto, IA ni embeddings**

8. **Lenguaje ubicuo natural**:
   - "Este documento ya pasó por Refinement"
   - "Falló el Refinement por baja calidad"
   - "El output de Refinement entra a Embedding"

---

## Comparación

| Aspecto         | document-processing | refinement   |
| --------------- | ------------------- | ------------ |
| Lenguaje Ubicuo | ❌ Técnico          | ✅ Natural   |
| Agnóstico       | ❌ Asume documentos | ✅ Genérico  |
| Implica Calidad | ❌ No               | ✅ Sí        |
| Eventos         | ❌ Verbosos         | ✅ Claros    |
| Métricas        | ❌ Ambiguas         | ✅ Naturales |
| Conversaciones  | ❌ Técnicas         | ✅ Fluidas   |

---

## Impacto

### Terminología Actualizada

#### Aggregates

- `ProcessedDocument` → `RefinedContent`
- `DocumentChunk` → `RefinedChunk`

#### Events

- `DocumentProcessedEvent` → `RefinementCompletedEvent`
- `DocumentProcessingFailedEvent` → `RefinementFailedEvent`
- `ChunkCreatedEvent` → `ChunkRefinedEvent`
- **Nuevos**: `RefinementStartedEvent`, `RefinementRejectedEvent`

#### Commands

- `ProcessDocumentCommand` → `RefineContentCommand`
- `ReprocessDocumentCommand` → `RerefineContentCommand`

#### Métricas

- `processing_quality_score` → `refinement_quality_score`
- `processing_precision` → `refinement_precision`
- `processing_throughput` → `refinement_throughput`

---

## Arquitectura Actualizada

```
Content Ingestion (contenido crudo)
    ↓ ContentIngestedEvent
REFINEMENT (contenido refinado)
    ↓ RefinementCompletedEvent
Embedding & Indexing (vectores)
    ↓ EmbeddingIndexedEvent
Knowledge Retrieval (búsqueda)
    ↓ DocumentsRetrievedEvent
RAG Assistant (respuestas)
```

---

## Documentación

### Documentos Creados

1. **[docs/refinement/00-WHY-REFINEMENT.md](./refinement/00-WHY-REFINEMENT.md)**
   - Justificación completa del nombre
   - Comparación detallada
   - Ejemplos de uso

2. **[docs/refinement/MIGRATION-GUIDE.md](./refinement/MIGRATION-GUIDE.md)**
   - Guía de migración completa
   - Checklist de cambios
   - Timeline estimado

3. **[docs/refinement/](./refinement/)**
   - Documentación completa del bounded context
   - 8 documentos detallados
   - Ejemplos de código

### Documentos Actualizados

1. **[docs/ROADMAP.md](./ROADMAP.md)**
   - Fase 1 renombrada a "Refinement"
   - Tabla de nombres actualizada

2. **[docs/refinement/README.md](./refinement/README.md)**
   - Índice actualizado
   - Referencias al nuevo nombre

---

## Próximos Pasos

### Implementación

1. ✅ Documentación completa creada
2. ✅ Naming decision documentada
3. ⏳ Implementar bounded context con nombre correcto
4. ⏳ Crear spec formal (requirements.md)
5. ⏳ Implementar Domain Layer
6. ⏳ Implementar Application Layer
7. ⏳ Implementar Infrastructure Layer
8. ⏳ Implementar API Layer

### No Requiere Migración

Como este bounded context **aún no está implementado**, no hay código que migrar. Simplemente usaremos el nombre correcto desde el inicio.

---

## Aprobación

**Aprobado por**: Equipo de Arquitectura
**Fecha**: 2025-01-08
**Razón**: Mejora significativa en lenguaje ubicuo y claridad del dominio

---

## Referencias

- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)

---

**Creado**: 2025-01-08
**Versión**: 1.0
**Autor**: Equipo de Arquitectura
