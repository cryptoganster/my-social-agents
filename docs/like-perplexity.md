# Arquitectura general del sistema de Perplexity

Una herramienta estilo Perplexity combina búsqueda web en tiempo real con generación de respuestas mediante un LLM (modelo de lenguaje grande). En esencia sigue un flujo de Retrieval-Augmented Generation (RAG): cuando el usuario pregunta algo, el sistema consulta buscadores web o un índice propio, recupera documentos relevantes, y alimenta un LLM con ese contexto para generar la respuesta.

## El procesamiento típico es:

### Búsqueda web / Scraping:

se envía la consulta a motores de búsqueda (p.ej. mediante API de Google/Bing o usando un metabusacdor como SearxNG) para obtener URLs relevantes. Luego se descarga y procesa el contenido (HTML) de esas páginas. Esto puede hacerse con herramientas como Scrapy, Puppeteer/Playwright (navegador headless) o librerías de scraping que extraen texto/Markdown[1][2].

### Procesado e indexado:

el texto obtenido se divide en fragmentos (“chunks”) y se transforma en vectores mediante técnicas de embedding. Estos vectores se guardan en una base de datos vectorial (p.ej. Qdrant, Pinecone, Weaviate), lo que permite buscar semánticamente el contenido más pertinente para consultas futuras[3].

### Generación con LLM:

al generar la respuesta, el sistema recupera de la base vectorial los fragmentos más relevantes (según similitud de vectores) y los agrega al prompt del LLM como contexto. El LLM (ya sea local o vía API en la nube) entonces combina ese contexto fresco con su conocimiento pre-entrenado para producir una respuesta precisa y citada[4][3].

### Interfaz de usuario (UI):

se presenta una interfaz de chat o buscador web (por ejemplo, una aplicación web en Next.js/React) donde el usuario escribe la consulta y recibe la respuesta con las fuentes citadas. El frontend también puede manejar sesiones, historial y componentes adicionales (widgets, manejo de archivos, etc.).

### En resumen, los componentes clave son:

módulo de búsqueda/web crawling, procesador de texto, almacenamiento/retrieval (vector DB), LLM de generación, y presentación de resultados. Por ejemplo, el proyecto PyPlexitas ilustra esta arquitectura: usa la API de Google/Bing para obtener URLs, raspa el contenido, genera embeddings almacenados en Qdrant, y finalmente invoca un LLM (GPT-4 u otro) para responder[3][5]. En conjunto, este pipeline RAG mantiene las respuestas actualizadas y fundadas en fuentes en línea[4][3].

## Frameworks y librerías útiles

### Varias librerías facilitan la construcción del sistema:

#### LangChain:

plataforma modular para encadenar LLMs con herramientas y APIs. Facilita integrar buscadores, base de datos y LLMs (p.ej. con chains y agents)[17]. Destaca en flexibilidad y gestión de prompts complejos.

#### LlamaIndex (antes GPT Index):

se especializa en indexar y consultar grandes colecciones de texto para RAG. Ofrece utilidades para convertir documentos a índices semánticos y optimizar queries LLM[18]. Es ideal cuando el proyecto requiere manejar mucho texto privado o personalizado.

#### Haystack (by Deepset):

framework end-to-end para pipelines de QA y búsqueda semántica. Permite conectar recuperación (retrievers) y modelos LLM, usando distintos almacenes de documentos e incluso tablas vectoriales[19]. Es robusto para producción y escalable, pero más complejo de configurar.

#### DB Vectoriales + Headless Browsing + Scraping

Además, se recomiendan herramientas de base de datos vectorial (Pinecone, Qdrant, Weaviate, etc.) para el almacenamiento/recuperación eficiente de embeddings. También librerías de web scraping (Beautiful Soup, Scrapy) y de headless browsing (Puppeteer, Playwright, Selenium) son útiles para extraer contenido web. La biblioteca de Transformers de Hugging Face facilita cargar muchos LLM open-source. Por último, sistemas como OpenAI Functions o frameworks de agentes (p.ej. AutoGen) pueden ampliar la funcionalidad del asistente. En conjunto, estos marcos agilizan la conexión entre búsqueda web, repositorio de datos y modelo de lenguaje[17][18].

### Alternativas para scraping o acceso a resultados de búsqueda

#### Para obtener los resultados de búsqueda se pueden usar APIs oficiales o scraping:

**APIs oficiales de motores:** Google Custom Search API o Programmable Search (requiere clave), Microsoft Bing Search API (según licenciamiento). Brave Search, You.com y Yandex ofrecen APIs alternativas. Estas garantizan cumplimiento de TOS aunque suelen tener costo y límites.
**APIs no oficiales/terceros:** servicios como SerpApi, Serper.dev, DataForSEO, Zenserp, RapidAPI etc. SerpApi lidera el mercado, soporta Google, Bing, Baidu, etc., y devuelve resultados estructurados[20]. Usar estos evita gestionar scraping manual pero técnicamente violan los TOS de Google (aunque hay precedentes legales que permiten datos públicos[20]).
**Navegadores headless:** se puede controlar un navegador (Puppeteer, Playwright) para ejecutar búsquedas en Google/DuckDuckGo/Bing y extraer el HTML resultante. Esto permite sortear páginas dinámicas, pero requiere manejar bloqueos de anti-bots (captcha, proxies). Es efectivo para obtener “rich snippets” de Google (como mostró ScrapFly)[21].
**Buscadores alternativos:** DuckDuckGo ofrece un endpoint no oficial (“html.duckduckgo.com/html” o APIs libres) que puede scrapearse. También existen motores de metabusqueda libres como SearxNG, que combina múltiples fuentes (Google, Bing, Wikipedia, etc.) y respeta la privacidad del usuario[2]. Perplexica, por ejemplo, utiliza SearxNG para obtener resultados sin rastrear al usuario[2].

Al elegir la fuente de datos, siempre hay que cuidar el aspecto legal: escrapear resultados directamente puede violar los términos de servicio de los buscadores[22]. Por ello suele preferirse APIs o fuentes abiertas y respetar políticas de uso.

## Despliegue y escalabilidad

Para poner en producción este sistema se aconseja usar contenedores y orquestación (p.ej. Docker + Kubernetes) por su escalabilidad. Kubernetes permite escalar horizontalmente las réplicas del servicio LLM según demanda (añadiendo GPUs si es necesario) y gestiona recursos (GPU/memoria) de forma eficiente[23]. Por ejemplo, un cluster en la nube (AWS EKS, GCP GKE, Azure AKS) con nodos GPU puede alojar la API del LLM y los microservicios de scraping y búsqueda. Se recomienda también usar:
**Base de datos robusta** (p.ej. PostgreSQL o MongoDB para metadatos y cache, Redis para colas/servicios rápidos).
**Almacenamiento vectorial escalable** (Pinecone, Qdrant, etc.) con alta disponibilidad.
**Balanceadores de carga y autoescalado:** configurar el clúster para ajustar réplicas en función de la demanda.
**Caché de consultas frecuentes** (para evitar repetir búsquedas costosas).
**CDN para servir recursos estáticos** (front-end, scripts) y optimizar latencias.
Además de la nube, hay soluciones de GPU compartida (Runpod, Lambda Labs) o servicios de inferencia dedicados. LangChain, por ejemplo, sugiere infraestructura AWS con EKS, Redis, RDS/Aurora, S3, etc. para producción[24][23]. En resumen, use contenedores Docker con GPUs, habilite autoescalado y redundancia (multi-AZ), y monitorice el rendimiento (CloudWatch/Prometheus) para mantener la latencia baja a medida que crece el uso[23][25].

## Referencias:

[1] Build your own AI search engine similar to Perplexity - DEV Community
https://dev.to/shayy/how-to-build-a-perplexity-clone-ai-search-engine-with-ai-agents-28g1
[2] [30] [31] GitHub - ItzCrazyKns/Perplexica: Perplexica is an AI-powered answering engine. It is an Open source alternative to Perplexity AI
https://github.com/ItzCrazyKns/Perplexica
[3] [5] PyPlexitas: Open Source CLI Alternative to Perplexity AI | kruyt.org
https://kruyt.org/PyPlexitas/
[4] [6] Inside Perplexity AI: How Their Revolutionary Search Engine Works, Its Base Model & RAG, and How They Pick Companies to Show You
https://www.xfunnel.ai/blog/inside-perplexity-ai
[7] [8] [9] [10] [11] [12] [13] [14] [15] Top 10 open source LLMs for 2025
https://www.instaclustr.com/education/open-source-ai/top-10-open-source-llms-for-2025/
[16] Los 10 mejores modelos de lenguaje grande (LLMs) de 2025
https://botpress.com/es/blog/best-large-language-models
[17] [18] [19] LangChain , LlamaIndex, or Haystack: Which Framework Suits Your LLM Needs? | by Karthikeyan Dhanakotti | Medium
https://dkaarthick.medium.com/langchain-llamaindex-or-haystack-which-framework-suits-your-llm-needs-7408fee8ab1e
[20] Best SERP APIs in 2026: Official Google Alternatives & Third-Party Providers
https://scrapfly.io/blog/posts/google-serp-api-and-alternatives
[21] How to Scrape Google Search Results in 2026
https://scrapfly.io/blog/posts/how-to-scrape-google
[22] [26] [27] [28] [29] Is Web Scraping Legal? the Comprehensive Guide for 2025
https://www.capsolver.com/blog/All/web-scraping-legal
[23] [25] Implementación de grandes modelos de lenguaje en Kubernetes: una guía completa – Unite.AI
https://www.unite.ai/es/deploying-large-language-models-on-kubernetes-a-comprehensive-guide/
[24] Self-hosted on AWS - Docs by LangChain
https://docs.langchain.com/langsmith/aws-self-hosted
