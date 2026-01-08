# LangChain – Guía completa para desarrolladores (educativo)

## ¿Qué es LangChain?

**LangChain** es un framework _open source_ para construir aplicaciones basadas en **Large Language Models (LLMs)**. Su objetivo principal es facilitar la creación de **agentes**, **pipelines**, **RAG (Retrieval-Augmented Generation)** y **workflows complejos**, conectando modelos de lenguaje con herramientas externas, memoria y fuentes de datos.

Está disponible principalmente en:

- **TypeScript / JavaScript**
- **Python**

LangChain no es solo una librería para llamar a LLMs, sino un **framework de orquestación** para sistemas de IA.

---

## Arquitectura general

LangChain se apoya en varios conceptos clave:

- **LLMs / Chat Models**
- **Prompt Templates**
- **Chains**
- **Agents**
- **Tools**
- **Memory**
- **Retrievers & Vector Stores**
- **Output Parsers**
- **LangGraph** (motor de flujos y agentes)
- **LangSmith** (observabilidad, evaluación y deploy)

---

## 1. Models (LLMs y Chat Models)

LangChain abstrae múltiples proveedores bajo una misma interfaz.

### Proveedores soportados

- OpenAI (GPT-4o, GPT-4, GPT-3.5, embeddings)
- Anthropic (Claude)
- Google (Gemini / PaLM)
- Cohere
- HuggingFace
- Azure OpenAI
- AWS Bedrock
- Local models (Ollama, GPT4All, etc.)

### Ejemplo (TypeScript)

```ts
import { ChatOpenAI } from '@langchain/openai';

const llm = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0.2,
});

const response = await llm.invoke('Explícame qué es LangChain');
```

---

## 2. Prompt Templates

Permiten crear prompts reutilizables y parametrizados.

### Tipos

- `PromptTemplate` (texto plano)
- `ChatPromptTemplate` (mensajes de chat)
- `FewShotPromptTemplate`

### Ejemplo

```ts
import { ChatPromptTemplate } from '@langchain/core/prompts';

const prompt = ChatPromptTemplate.fromTemplate('Explícame {concepto} como si tuviera {edad} años');

const formatted = await prompt.invoke({
  concepto: 'programación',
  edad: 10,
});
```

---

## 3. Chains

Una **Chain** es un pipeline que conecta prompts, modelos y parsers.

### Ejemplo básico

```ts
const chain = prompt.pipe(llm);

const result = await chain.invoke({
  concepto: 'IA',
  edad: 12,
});
```

### Casos de uso

- Traducción
- Resúmenes
- Clasificación
- Q&A
- Generación de código

---

## 4. Output Parsers

Transforman la salida del modelo en datos estructurados.

### Tipos comunes

- JSON Parser
- Zod Parser
- Structured Output

### Ejemplo con Zod

```ts
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

const schema = z.object({
  titulo: z.string(),
  resumen: z.string(),
});

const parser = StructuredOutputParser.fromZodSchema(schema);
```

---

## 5. Tools (Herramientas)

Las **tools** permiten a los agentes ejecutar funciones externas.

### Características

- Tienen nombre y descripción
- Definen un schema de entrada
- Son invocadas automáticamente por el agente

### Ejemplo

```ts
import { tool } from 'langchain';
import { z } from 'zod';

const getWeather = tool(({ city }) => `Clima en ${city}: 25°C`, {
  name: 'get_weather',
  description: 'Obtiene el clima de una ciudad',
  schema: z.object({
    city: z.string(),
  }),
});
```

---

## 6. Agents

Un **Agent** razona, decide qué tool usar y ejecuta pasos hasta resolver una tarea.

### Características

- Basados en ReAct (Reason + Act)
- Pueden llamar múltiples tools
- Mantienen estado y memoria
- Usan LangGraph internamente

### Ejemplo

```ts
import { createAgent } from 'langchain';

const agent = createAgent({
  model: 'openai:gpt-4o',
  tools: [getWeather],
  systemPrompt: 'Eres un asistente experto en clima',
});

const result = await agent.invoke({
  messages: [{ role: 'user', content: '¿Cómo está el clima en Madrid?' }],
});
```

---

## 7. Memory

LangChain soporta **memoria a corto y largo plazo**.

### Tipos

- **Short-term memory**: historial de conversación
- **Long-term memory**: bases externas (vector DB, KV stores)

### Checkpointers

```ts
import { MemorySaver } from '@langchain/langgraph';

const agent = createAgent({
  model: 'gpt-4o',
  tools: [],
  checkpointer: new MemorySaver(),
});
```

---

## 8. Vector Stores & Embeddings

Se usan para búsqueda semántica y RAG.

### Vector Stores soportados

- MemoryVectorStore
- Pinecone
- Chroma
- Qdrant
- Weaviate
- Supabase Vector
- Redis Vector

### Ejemplo

```ts
import { MemoryVectorStore } from '@langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

const store = new MemoryVectorStore(new OpenAIEmbeddings());

await store.addDocuments([{ pageContent: 'LangChain es un framework de IA' }]);

const results = await store.similaritySearch('¿Qué es LangChain?');
```

---

## 9. RAG (Retrieval-Augmented Generation)

Combina **búsqueda + generación**.

### Tipos

- RAG clásico (2 pasos)
- RAG agentic (decide cuándo buscar)

### Flujo típico

1. Usuario pregunta
2. Retriever busca documentos
3. LLM responde con contexto

---

## 10. Retrievers

Interfaz estándar para buscar información.

```ts
const retriever = store.asRetriever();

const docs = await retriever.invoke('IA conversacional');
```

---

## 11. Document Loaders

Permiten cargar datos desde:

- PDFs
- HTML / Web
- Notion
- Google Drive
- SQL / NoSQL
- APIs externas

Ejemplo:

```ts
import { WebBaseLoader } from 'langchain/document_loaders/web';

const loader = new WebBaseLoader('https://example.com');
const docs = await loader.load();
```

---

## 12. LangGraph

Motor de orquestación basado en **grafos de estado**.

### Permite

- Flujos complejos
- Loops
- Multi-agente
- Human-in-the-loop
- Estados persistentes

LangGraph es la base real de los **agents modernos** en LangChain.

---

## 13. LangSmith

Plataforma oficial para:

- Observabilidad
- Tracing
- Debugging
- Evaluaciones
- Deploy de agentes

### Casos de uso

- Ver paso a paso el razonamiento del agente
- Comparar prompts y modelos
- Evaluar calidad
- Deploy productivo

---

## Casos de uso comunes

- Chatbots avanzados
- Asistentes con herramientas
- RAG empresarial
- Automatización de workflows
- Análisis de documentos
- Sistemas multi-agente
- SaaS con IA
- Bots para WhatsApp / Slack / Web

---

## Resumen final

LangChain es:

- 🧠 Framework de orquestación de LLMs
- 🧩 Modular y extensible
- 🤖 Ideal para agentes autónomos
- 🔍 Perfecto para RAG
- 🚀 Listo para producción con LangSmith
- 💻 Excelente soporte en TypeScript y Python
