## 1️⃣ No es “solo DB vectorial” (esa es una confusión común)

En un Perplexity-like **siempre hay al menos 3 capas de almacenamiento**:

### 🔹 1. DB relacional (o documental)

Para **estado, control y metadata**, por ejemplo:

- Queries del usuario
- Historial de búsquedas
- URLs consultadas
- Fecha, score, idioma
- Relación `query → fuentes → chunks`
- Usuarios, planes, límites, billing
- Cache de resultados

👉 PostgreSQL / MySQL / MongoDB / SQLite (en MVP)

---

### 🔹 2. Vector DB (embeddings)

Solo para **búsqueda semántica**, no para “datos de negocio”.

- `chunk_id`
- `embedding: float[]`
- metadata mínima (url, title, timestamp)

Ejemplos:

- Qdrant
- Weaviate
- Pinecone
- Milvus
- pgvector (si quieres simplificar)

---

### 🔹 3. Cache / memoria temporal

Para cosas **efímeras**:

- Resultados recientes
- Contexto de una sola query
- Embeddings temporales

👉 Redis / in-memory

---

## 2️⃣ Entonces… ¿cómo se hace embedding de algo que NO está persistido?

Hay **3 patrones reales** usados en producción:

---

## 🟢 PATRÓN 1 — Embedding “on the fly” (Perplexity-style)

Este es el más importante 👇

### Flujo:

```
Query usuario
  ↓
Búsqueda web
  ↓
Fetch HTML
  ↓
Clean + chunk
  ↓
Embedding EN MEMORIA
  ↓
Rerank
  ↓
LLM
  ↓
Respuesta
```

🔑 **NO se guarda el embedding**

- Vive solo en RAM
- Se descarta al terminar la request

### Cuándo se usa:

- Búsquedas en tiempo real
- Noticias
- Preguntas únicas
- Web search

📌 Esto responde directamente a tu duda:

> 👉 **Sí, puedes generar embeddings sin persistir nada**

---

## 🟢 PATRÓN 2 — Persistencia selectiva (híbrido)

Aquí guardas **solo lo que vale la pena**.

### Ejemplo:

- URLs que se repiten mucho
- Wikipedia
- Docs técnicos
- Papers
- Blogs de alta autoridad

### Flujo:

```
¿URL ya existe?
  ├─ Sí → usar embeddings existentes
  └─ No → embedding temporal
            ├─ ¿vale la pena?
            │     ├─ Sí → persistir
            │     └─ No → descartar
```

📌 Esto es lo más común en sistemas grandes.

---

## 🟢 PATRÓN 3 — Ingestión offline (RAG clásico)

Aquí **todo se persiste**.

- Scraping programado
- PDFs
- Docs internos
- Bases de conocimiento

### Flujo:

```
Ingest job
  ↓
Chunk
  ↓
Embedding
  ↓
Vector DB
```

Se usa cuando:

- El contenido es estable
- Necesitas latencia baja
- Tienes dominio controlado

---

## 3️⃣ ¿Pero entonces cómo “buscas” si no está persistido?

Buena observación 👇
En Perplexity-like **no haces similarity search contra una DB**, haces:

### 🔹 Reranking en memoria

1. Embedding del query
2. Embedding de N chunks recién scrapeados
3. Cosine similarity en RAM
4. Te quedas con top-K

Esto es **barato y rápido** porque:

- N ≈ 10–50 chunks
- No necesitas indexado

---

## 4️⃣ Arquitectura correcta (simplificada)

```
Postgres
  ├─ queries
  ├─ urls
  ├─ sessions
  └─ cache metadata

Vector DB
  ├─ chunk_id
  └─ embedding[]

RAM / Redis
  ├─ chunks temporales
  └─ embeddings temporales
```

---

## 5️⃣ Decisión práctica (MVP vs escala)

### 🧪 MVP

- SQLite / Postgres
- Embeddings en memoria
- ❌ Vector DB al inicio

### 🚀 Producción

- Postgres + Redis
- Vector DB solo para:
  - contenido reutilizable
  - dominio propio

---

## 6️⃣ Regla de oro (muy importante)

> **No todo merece embedding persistido**

Guardar embeddings cuesta:

- Dinero
- Complejidad
- Reindexado

Perplexity **prioriza velocidad y actualidad**, no persistencia total.
