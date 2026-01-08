# Guía de Migración: Document Processing → Refinement

## Resumen del Cambio

**Fecha**: 2025-01-08
**Tipo**: Renaming de Bounded Context
**Impacto**: Naming, terminología, eventos, métricas

---

## Cambio de Nombre

### Bounded Context

| Antes                 | Después      |
| --------------------- | ------------ |
| `document-processing` | `refinement` |

### Justificación

Ver: [00-WHY-REFINEMENT.md](./00-WHY-REFINEMENT.md)

**Resumen**:

- ✅ Lenguaje ubicuo más natural
- ✅ Agnóstico de implementación
- ✅ Refleja mejora de calidad
- ✅ Eventos más claros
- ✅ Métricas naturales

---

## Cambios en Terminología

### Aggregates

| Antes               | Después          | Archivo                                |
| ------------------- | ---------------- | -------------------------------------- |
| `ProcessedDocument` | `RefinedContent` | `domain/aggregates/refined-content.ts` |
| `DocumentChunk`     | `RefinedChunk`   | `domain/entities/refined-chunk.ts`     |

### Value Objects

| Antes              | Después            | Archivo                                     |
| ------------------ | ------------------ | ------------------------------------------- |
| `ProcessingStatus` | `RefinementStatus` | `domain/value-objects/refinement-status.ts` |
| `ProcessingConfig` | `RefinementConfig` | `domain/value-objects/refinement-config.ts` |
| `ProcessingError`  | `RefinementError`  | `domain/value-objects/refinement-error.ts`  |

### Domain Events

| Antes                           | Después                    | Archivo                                       |
| ------------------------------- | -------------------------- | --------------------------------------------- |
| `DocumentProcessedEvent`        | `RefinementCompletedEvent` | `domain/events/refinement-completed.event.ts` |
| `DocumentProcessingFailedEvent` | `RefinementFailedEvent`    | `domain/events/refinement-failed.event.ts`    |
| `ChunkCreatedEvent`             | `ChunkRefinedEvent`        | `domain/events/chunk-refined.event.ts`        |

**Nuevos Eventos**:

- `RefinementStartedEvent` - Cuando comienza el refinamiento
- `RefinementRejectedEvent` - Cuando se rechaza por baja calidad

### Commands

| Antes                      | Después                  | Archivo                                    |
| -------------------------- | ------------------------ | ------------------------------------------ |
| `ProcessDocumentCommand`   | `RefineContentCommand`   | `app/commands/refine-content/command.ts`   |
| `ReprocessDocumentCommand` | `RerefineContentCommand` | `app/commands/rerefine-content/command.ts` |

### Queries

| Antes                       | Después                   | Archivo                                      |
| --------------------------- | ------------------------- | -------------------------------------------- |
| `GetProcessedDocumentQuery` | `GetRefinedContentQuery`  | `app/queries/get-refined-content/query.ts`   |
| `GetChunksByDocumentQuery`  | `GetChunksByContentQuery` | `app/queries/get-chunks-by-content/query.ts` |

### Repositories

| Antes                               | Después                          | Archivo                                                   |
| ----------------------------------- | -------------------------------- | --------------------------------------------------------- |
| `IProcessedDocumentWriteRepository` | `IRefinedContentWriteRepository` | `domain/interfaces/repositories/refined-content-write.ts` |
| `IProcessedDocumentReadRepository`  | `IRefinedContentReadRepository`  | `domain/interfaces/repositories/refined-content-read.ts`  |

### Factories

| Antes                       | Después                  | Archivo                                                  |
| --------------------------- | ------------------------ | -------------------------------------------------------- |
| `IProcessedDocumentFactory` | `IRefinedContentFactory` | `domain/interfaces/factories/refined-content-factory.ts` |

### CLI Commands

| Antes                          | Después                      |
| ------------------------------ | ---------------------------- |
| `npm run cli process:document` | `npm run cli refine:content` |
| `npm run cli process:batch`    | `npm run cli refine:batch`   |
| `npm run cli process:status`   | `npm run cli refine:status`  |

### HTTP Endpoints

| Antes                               | Después                           |
| ----------------------------------- | --------------------------------- |
| `POST /api/processing/documents`    | `POST /api/refinement/content`    |
| `GET /api/processing/documents/:id` | `GET /api/refinement/content/:id` |

### Métricas

| Antes                                   | Después                                  |
| --------------------------------------- | ---------------------------------------- |
| `processing_duration_seconds`           | `refinement_duration_seconds`            |
| `processing_throughput_docs_per_minute` | `refinement_throughput_items_per_minute` |
| `processing_chunks_per_document`        | `refinement_chunks_per_content`          |
| `chunk_quality_score`                   | `refinement_quality_score`               |
| `entity_extraction_precision`           | `refinement_entity_precision`            |

### Database Tables

| Antes                 | Después           |
| --------------------- | ----------------- |
| `processed_documents` | `refined_content` |
| `document_chunks`     | `refined_chunks`  |

---

## Estructura de Archivos

### Antes

```
src/document-processing/
├── domain/
│   ├── aggregates/
│   │   └── processed-document.ts
│   ├── entities/
│   │   └── document-chunk.ts
│   └── events/
│       └── document-processed.event.ts
├── app/
│   └── commands/
│       └── process-document/
└── infra/
    └── repositories/
        └── typeorm-processed-document-write.ts
```

### Después

```
src/refinement/
├── domain/
│   ├── aggregates/
│   │   └── refined-content.ts
│   ├── entities/
│   │   └── refined-chunk.ts
│   └── events/
│       ├── refinement-completed.event.ts
│       ├── refinement-failed.event.ts
│       ├── refinement-started.event.ts
│       └── refinement-rejected.event.ts
├── app/
│   └── commands/
│       └── refine-content/
└── infra/
    └── repositories/
        └── typeorm-refined-content-write.ts
```

---

## Pasos de Migración

### 1. Renombrar Carpeta Principal

```bash
mv src/document-processing src/refinement
```

### 2. Actualizar Imports

```typescript
// Antes
import { ProcessedDocument } from '@/document-processing/domain/aggregates/processed-document';

// Después
import { RefinedContent } from '@/refinement/domain/aggregates/refined-content';
```

### 3. Actualizar NestJS Module

```typescript
// Antes
@Module({
  imports: [DocumentProcessingModule],
})

// Después
@Module({
  imports: [RefinementModule],
})
```

### 4. Actualizar Database Migrations

```typescript
// Crear nueva migración
npm run migration:create RenameProcessedDocumentsToRefinedContent

// En la migración
export class RenameProcessedDocumentsToRefinedContent1704000000001 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameTable('processed_documents', 'refined_content');
    await queryRunner.renameTable('document_chunks', 'refined_chunks');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameTable('refined_content', 'processed_documents');
    await queryRunner.renameTable('refined_chunks', 'document_chunks');
  }
}
```

### 5. Actualizar Environment Variables

```bash
# Antes
PROCESSING_CHUNK_SIZE=1000
PROCESSING_CHUNK_OVERLAP=200

# Después
REFINEMENT_CHUNK_SIZE=1000
REFINEMENT_CHUNK_OVERLAP=200
```

### 6. Actualizar Métricas y Logs

```typescript
// Antes
logger.info('Document processing started', { documentId });
metrics.increment('processing_started');

// Después
logger.info('Refinement started', { contentId });
metrics.increment('refinement_started');
```

### 7. Actualizar Tests

```typescript
// Antes
describe('ProcessedDocument', () => {
  it('should process document', () => {
    const doc = ProcessedDocument.create('content-123');
    // ...
  });
});

// Después
describe('RefinedContent', () => {
  it('should refine content', () => {
    const content = RefinedContent.create('content-123');
    // ...
  });
});
```

### 8. Actualizar Documentación

```bash
# Renombrar carpeta de docs
mv docs/document-processing docs/refinement

# Actualizar referencias en README, ROADMAP, etc.
```

---

## Checklist de Migración

### Código

- [ ] Renombrar carpeta `src/document-processing` → `src/refinement`
- [ ] Actualizar imports en todos los archivos
- [ ] Renombrar clases y interfaces
- [ ] Actualizar NestJS modules
- [ ] Actualizar event names
- [ ] Actualizar command/query names

### Base de Datos

- [ ] Crear migration para renombrar tablas
- [ ] Ejecutar migration en desarrollo
- [ ] Validar que los datos se migraron correctamente
- [ ] Ejecutar migration en staging
- [ ] Ejecutar migration en producción

### Configuración

- [ ] Actualizar environment variables
- [ ] Actualizar archivos de configuración
- [ ] Actualizar scripts de deployment

### Observabilidad

- [ ] Actualizar nombres de métricas
- [ ] Actualizar dashboards de Grafana
- [ ] Actualizar alertas
- [ ] Actualizar logs

### Documentación

- [ ] Renombrar carpeta de docs
- [ ] Actualizar README
- [ ] Actualizar ROADMAP
- [ ] Actualizar diagramas
- [ ] Actualizar ejemplos de código

### Tests

- [ ] Actualizar nombres de tests
- [ ] Actualizar mocks
- [ ] Actualizar fixtures
- [ ] Ejecutar todos los tests

### CLI/API

- [ ] Actualizar CLI commands
- [ ] Actualizar HTTP endpoints
- [ ] Actualizar DTOs
- [ ] Actualizar documentación de API

---

## Impacto

### Alto Impacto

- ✅ Nombres de clases y archivos
- ✅ Imports en todo el código
- ✅ Database tables
- ✅ CLI commands
- ✅ HTTP endpoints

### Medio Impacto

- ⚠️ Environment variables
- ⚠️ Métricas y dashboards
- ⚠️ Logs y alertas

### Bajo Impacto

- ℹ️ Documentación
- ℹ️ Comentarios en código
- ℹ️ Tests

---

## Rollback Plan

Si necesitas revertir el cambio:

1. **Revertir código**:

   ```bash
   git revert <commit-hash>
   ```

2. **Revertir database**:

   ```bash
   npm run migration:revert
   ```

3. **Revertir configuración**:
   - Restaurar environment variables
   - Restaurar archivos de configuración

4. **Revertir observabilidad**:
   - Restaurar métricas
   - Restaurar dashboards
   - Restaurar alertas

---

## Timeline Estimado

| Fase          | Duración   | Descripción                       |
| ------------- | ---------- | --------------------------------- |
| Preparación   | 1 día      | Planificación y revisión          |
| Código        | 2 días     | Renaming de clases, imports, etc. |
| Database      | 1 día      | Migrations y validación           |
| Tests         | 1 día      | Actualización y ejecución         |
| Documentación | 1 día      | Actualización completa            |
| Deployment    | 1 día      | Deploy a staging y producción     |
| **Total**     | **7 días** | **1 semana de trabajo**           |

---

## Preguntas Frecuentes

### ¿Por qué cambiar el nombre ahora?

Porque aún no hemos implementado el contexto. Es el momento perfecto para establecer el nombre correcto desde el inicio.

### ¿Qué pasa con el código existente?

No hay código existente. Este es un bounded context nuevo que estamos por implementar.

### ¿Afecta a otros bounded contexts?

No. Los otros contextos (Content Ingestion, Embedding & Indexing, etc.) solo necesitan actualizar las referencias a los eventos publicados por Refinement.

### ¿Necesitamos migrar datos?

No, porque aún no hay datos. Cuando implementemos, usaremos los nombres correctos desde el inicio.

---

## Contacto

Para preguntas sobre esta migración:

- Equipo de Arquitectura
- Equipo de Desarrollo

---

**Creado**: 2025-01-08
**Versión**: 1.0
**Estado**: Planificado (no implementado aún)
