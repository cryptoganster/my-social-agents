# Refinement - Documentación Completa

## ¿Por Qué "Refinement"?

**Refinement** es el bounded context responsable de **refinar contenido crudo** hasta que sea útil y significativo. El nombre refleja la esencia del dominio: mejora de calidad, no solo transformación técnica.

👉 **Lee**: [00-WHY-REFINEMENT.md](./00-WHY-REFINEMENT.md) para entender la decisión de naming.

---

## Índice de Documentos

### 📚 Documentación Principal

0. **[00-WHY-REFINEMENT.md](./00-WHY-REFINEMENT.md)** - Por qué "Refinement" vs "Document Processing"
   - Justificación del nombre
   - Lenguaje ubicuo
   - Comparación directa
   - Terminología actualizada

1. **[01-introduction.md](./01-introduction.md)** - Introducción y visión general
   - Contexto del sistema
   - Problema que resuelve
   - Objetivos y alcance
   - Beneficios esperados

2. **[02-observaciones-clave.md](./02-observaciones-clave.md)** - Lecciones aprendidas
   - Mejores prácticas de RAG
   - Anti-patterns a evitar
   - Decisiones de arquitectura
   - Observaciones de sistemas en producción

3. **[03-arquitectura.md](./03-arquitectura.md)** - Arquitectura detallada
   - Clean Architecture (4 capas)
   - Domain Layer
   - Application Layer
   - Infrastructure Layer
   - API Layer
   - Flujo de refinamiento completo

4. **[04-tech-stack.md](./04-tech-stack.md)** - Stack tecnológico
   - Tecnologías core
   - Dependencias
   - Configuración
   - Performance y escalabilidad

5. **[05-responsabilidades.md](./05-responsabilidades.md)** - Responsabilidades del contexto
   - Chunking semántico (refinamiento de forma)
   - Enriquecimiento de contenido (refinamiento de significado)
   - Metadata generation
   - Validación de calidad (refinamiento de calidad)

6. **[06-bounded-context.md](./06-bounded-context.md)** - Propuesta de Bounded Context
   - Límites del contexto
   - Integración con otros contextos
   - Comunicación via eventos
   - Anti-Corruption Layers

7. **[07-estructura-archivos.md](./07-estructura-archivos.md)** - Estructura de archivos
   - Organización de carpetas
   - Propósito de cada archivo
   - Convenciones de nombres
   - Ejemplos de rutas

8. **[08-ejemplos.md](./08-ejemplos.md)** - Ejemplos de código
   - Ejemplos de uso
   - Casos de uso comunes
   - Snippets de código
   - Tests de ejemplo

9. **[09-integracion.md](./09-integracion.md)** - Integración con otros contextos
   - Content Ingestion
   - Embedding & Indexing
   - Eventos y comunicación
   - Diagramas de secuencia

10. **[10-agregados-entidades.md](./10-agregados-entidades.md)** - Agregados y Entidades
    - ProcessedDocument (Aggregate Root)
    - DocumentChunk (Entity)
    - Invariantes y reglas de negocio
    - Métodos y comportamiento

11. **[11-eventos-dominio.md](./11-eventos-dominio.md)** - Eventos del dominio
    - DocumentProcessedEvent
    - DocumentProcessingFailedEvent
    - ChunkCreatedEvent
    - Event handlers

12. **[12-commands-queries.md](./12-commands-queries.md)** - Commands y Queries
    - ProcessDocumentCommand
    - ReprocessDocumentCommand
    - GetProcessedDocumentQuery
    - GetChunksByDocumentQuery

13. **[13-api.md](./13-api.md)** - API HTTP
    - Endpoints REST
    - Request/Response DTOs
    - Error handling
    - Autenticación

14. **[14-cli.md](./14-cli.md)** - CLI Commands
    - process:document
    - process:batch
    - process:status
    - Ejemplos de uso

15. **[15-value-objects.md](./15-value-objects.md)** - Value Objects
    - ChunkHash
    - ChunkPosition
    - CryptoEntity
    - TemporalContext
    - QualityScore

16. **[16-features.md](./16-features.md)** - Features y capacidades
    - Chunking strategies
    - Entity extraction
    - Temporal analysis
    - Quality scoring

17. **[17-dependencias.md](./17-dependencias.md)** - Dependencias externas
    - LangChain
    - OpenAI
    - spaCy
    - chrono-node

18. **[18-metricas-observabilidad.md](./18-metricas-observabilidad.md)** - Métricas y observabilidad
    - Métricas de performance
    - Métricas de calidad
    - Logging
    - Tracing
    - Alerting

19. **[19-testing.md](./19-testing.md)** - Testing
    - Unit tests
    - Integration tests
    - Property-based tests
    - E2E tests
    - Golden tests

20. **[20-seguridad.md](./20-seguridad.md)** - Seguridad
    - Validación de inputs
    - Sanitización de contenido
    - Rate limiting
    - Secrets management

## Guía de Lectura

### Para Arquitectos

1. Leer: 01, 02, 03, 06, 09
2. Revisar: 10, 11, 12
3. Validar: 04, 18, 20

### Para Desarrolladores

1. Leer: 01, 03, 07
2. Estudiar: 08, 10, 11, 12, 15
3. Implementar: 13, 14, 19

### Para DevOps

1. Leer: 04, 17, 18
2. Configurar: 13, 20
3. Monitorear: 18

### Para Product Managers

1. Leer: 01, 05, 16
2. Entender: 02, 06, 09

## Quick Start

### 1. Leer Introducción

```bash
cat docs/document-processing/01-introduction.md
```

### 2. Entender Arquitectura

```bash
cat docs/document-processing/03-arquitectura.md
```

### 3. Ver Ejemplos

```bash
cat docs/document-processing/08-ejemplos.md
```

### 4. Implementar

```bash
# Ver estructura de archivos
cat docs/document-processing/07-estructura-archivos.md

# Comenzar con Domain Layer
# Seguir con Application Layer
# Implementar Infrastructure
# Finalizar con API Layer
```

## Recursos Adicionales

### Documentación Externa

- [LangChain Docs](https://docs.langchain.com/)
- [NestJS Docs](https://docs.nestjs.com/)
- [TypeORM Docs](https://typeorm.io/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

### Repositorios de Referencia

- [LangChain Examples](https://github.com/langchain-ai/langchain/tree/master/examples)
- [NestJS CQRS](https://github.com/nestjs/cqrs)
- [DDD Examples](https://github.com/ddd-by-examples)

### Artículos Recomendados

- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Chunking Strategies](https://www.llamaindex.ai/blog/evaluating-the-ideal-chunk-size-for-a-rag-system-using-llamaindex-6207e5d3fec5)
- [Entity Extraction](https://huggingface.co/blog/entity-extraction)

## Contribuir

### Reportar Issues

- Usar GitHub Issues
- Incluir logs y contexto
- Reproducir el problema

### Proponer Mejoras

- Crear Pull Request
- Seguir convenciones de código
- Incluir tests

### Actualizar Documentación

- Mantener consistencia
- Agregar ejemplos
- Revisar links

---

**Creado**: 2025-01-08
**Versión**: 1.0
**Mantenedor**: Equipo de Desarrollo
