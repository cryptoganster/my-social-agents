# Docker Setup

Este documento explica cómo configurar y usar Docker para el desarrollo local con PostgreSQL.

## 📦 Servicios Incluidos

### PostgreSQL 16

- **Puerto**: 5432
- **Usuario**: postgres
- **Contraseña**: postgres
- **Base de datos**: crypto_knowledge
- **Imagen**: postgres:16-alpine

### pgAdmin 4 (Opcional)

- **Puerto**: 5050
- **Email**: admin@crypto.local
- **Contraseña**: admin
- **URL**: http://localhost:5050

## 🚀 Comandos Rápidos

### Iniciar servicios

```bash
npm run docker:up
```

### Detener servicios

```bash
npm run docker:down
```

### Ver logs de PostgreSQL

```bash
npm run docker:logs
```

### Reiniciar PostgreSQL

```bash
npm run docker:restart
```

### Limpiar todo (incluyendo volúmenes)

```bash
npm run docker:clean
```

## 📝 Configuración

### Variables de Entorno

Copia `.env.example` a `.env` y ajusta los valores si es necesario:

```bash
cp .env.example .env
```

Contenido de `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=crypto_knowledge

# Application Configuration
NODE_ENV=development
PORT=3000

# Logging
LOG_LEVEL=debug
```

## 🗄️ Migraciones

### Crear una nueva migración

```bash
npm run migration:create src/ingestion/migrations/MigrationName
```

### Generar migración desde entidades

```bash
npm run migration:generate src/ingestion/migrations/MigrationName
```

### Ejecutar migraciones

```bash
npm run migration:run
```

### Revertir última migración

```bash
npm run migration:revert
```

### Ver estado de migraciones

```bash
npm run migration:show
```

## 🔧 Uso con pgAdmin

1. Inicia los servicios: `npm run docker:up`
2. Abre http://localhost:5050 en tu navegador
3. Inicia sesión con:
   - Email: `admin@crypto.local`
   - Contraseña: `admin`
4. Agrega un nuevo servidor:
   - **General > Name**: Crypto Knowledge DB
   - **Connection > Host**: `postgres` (nombre del servicio en Docker)
   - **Connection > Port**: `5432`
   - **Connection > Username**: `postgres`
   - **Connection > Password**: `postgres`
   - **Connection > Database**: `crypto_knowledge`

## 🐳 Comandos Docker Directos

Si prefieres usar Docker directamente:

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f postgres

# Detener servicios
docker-compose down

# Limpiar volúmenes
docker-compose down -v

# Reiniciar un servicio
docker-compose restart postgres

# Ver estado de servicios
docker-compose ps

# Ejecutar comando en PostgreSQL
docker-compose exec postgres psql -U postgres -d crypto_knowledge
```

## 🔍 Verificar Conexión

### Desde la aplicación

```bash
npm run start:dev
```

La aplicación debería conectarse automáticamente a PostgreSQL.

### Desde psql

```bash
docker-compose exec postgres psql -U postgres -d crypto_knowledge
```

### Desde código

```typescript
import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source';

// Inicializar conexión
await AppDataSource.initialize();
console.log('✅ Conectado a PostgreSQL');
```

## 📊 Estructura de Volúmenes

Los datos se persisten en volúmenes Docker:

- `postgres_data`: Datos de PostgreSQL
- `pgadmin_data`: Configuración de pgAdmin

Para limpiar completamente los datos:

```bash
npm run docker:clean
```

## 🛠️ Troubleshooting

### Puerto 5432 ya en uso

Si tienes PostgreSQL instalado localmente:

```bash
# Detener PostgreSQL local (macOS)
brew services stop postgresql

# O cambiar el puerto en docker-compose.yml
ports:
  - '5433:5432'  # Usar puerto 5433 en el host
```

### No se puede conectar a la base de datos

1. Verifica que los servicios estén corriendo:

   ```bash
   docker-compose ps
   ```

2. Verifica los logs:

   ```bash
   npm run docker:logs
   ```

3. Verifica las variables de entorno en `.env`

### Limpiar y reiniciar desde cero

```bash
npm run docker:clean
npm run docker:up
npm run migration:run
```

## 🎯 Flujo de Trabajo Recomendado

1. **Primera vez**:

   ```bash
   cp .env.example .env
   npm run docker:up
   npm run migration:run
   npm run start:dev
   ```

2. **Desarrollo diario**:

   ```bash
   npm run docker:up
   npm run start:dev
   ```

3. **Crear nueva entidad**:

   ```bash
   # 1. Crear entidad TypeORM en src/ingestion/*/infra/persistence/entities/
   # 2. Generar migración
   npm run migration:generate src/ingestion/migrations/AddNewEntity
   # 3. Ejecutar migración
   npm run migration:run
   ```

4. **Al terminar**:
   ```bash
   npm run docker:down
   ```

## 📚 Referencias

- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [pgAdmin Docker Hub](https://hub.docker.com/r/dpage/pgadmin4)
- [TypeORM Migrations](https://typeorm.io/migrations)
- [NestJS TypeORM](https://docs.nestjs.com/techniques/database)
