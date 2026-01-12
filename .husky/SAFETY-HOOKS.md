# Git Safety Hooks

Este proyecto incluye hooks de seguridad que **bloquean comandos peligrosos** para proteger el historial de Git y la calidad del código.

## 🛡️ Comandos Bloqueados

### 1. `git commit` en master (Commits directos bloqueados)

**Hook:** `pre-commit-branch-check`

**Por qué está bloqueado:**

- Todos los cambios deben ir a través de Pull Requests
- Mantiene historia limpia con feature branches atómicos
- Previene commits accidentales en master
- Fuerza colaboración y code review

**Alternativa correcta:**

```bash
# Crear feature branch
git checkout -b feature/mi-feature

# Hacer cambios y commitear
git add .
git commit -m "feat: mi cambio"

# Push y crear PR
git push -u origin feature/mi-feature
gh pr create --base master
```

**Qué hace el hook:**

- Detecta si estás en master/main/production/prod
- Bloquea el commit
- Muestra el workflow correcto

---

### 2. `git push --force` (Peligroso, puede sobrescribir trabajo)

**Hook:** `pre-push-safety`

**Por qué está bloqueado:**

- Puede sobrescribir cambios de otros desarrolladores
- No verifica si hay commits remotos que no has visto
- Es destructivo e irreversible

**Alternativa correcta:**

```bash
# Usar --force-with-lease (seguro)
git push --force-with-lease origin feature/mi-rama
```

**Diferencia:**

- `--force`: Sobrescribe sin verificar
- `--force-with-lease`: Solo sobrescribe si no hay cambios remotos nuevos

**Qué hace el hook:**

- Detecta intentos de force push
- Bloquea el push
- Recomienda usar `--force-with-lease`

---

### 3. `git push` sin rebase (Historia no lineal)

**Hook:** `pre-push-safety`

**Por qué está bloqueado:**

- Mantiene historia lineal (rebase strategy)
- Previene merge commits innecesarios
- Asegura que tu rama está actualizada con master

**Alternativa correcta:**

```bash
# Rebase antes de push
git fetch origin
git rebase origin/master

# Resolver conflictos si hay
git add <resolved-files>
git rebase --continue

# Push con force-with-lease
git push --force-with-lease origin feature/mi-rama
```

**Qué hace el hook:**

- Fetch automático de origin/master
- Compara merge-base con origin/master
- Bloquea push si no está rebasado
- Muestra cuántos commits estás detrás

---

### 4. `git checkout` con cambios sin commitear

**Hook:** `pre-checkout`

**Por qué está bloqueado:**

- Previene pérdida de trabajo
- Fuerza commits limpios y atómicos
- Evita mezclar cambios de diferentes features

**Alternativa correcta:**

```bash
# Opción 1: Commitear cambios
git add .
git commit -m "feat: mis cambios"
git checkout otra-rama

# Opción 2: Stash temporal
git stash
git checkout otra-rama
# ... trabajar ...
git checkout mi-rama
git stash pop
```

**Qué hace el hook:**

- Detecta cambios sin commitear
- Bloquea el checkout
- Muestra archivos modificados
- Sugiere opciones (commit, stash, discard)

---

### 5. `git commit --no-verify` (Salta validaciones críticas)

**Hook:** `pre-commit` + documentación

**Por qué está bloqueado:**

- Salta ESLint, Prettier, TypeScript
- Salta tests unitarios e integración
- Introduce código roto que falla en CI

**No hay alternativa:** Debes corregir los errores

**Validaciones que se saltan:**

1. **Branch check:** Commits directos en master
2. **ESLint:** Errores de código y malas prácticas
3. **Prettier:** Formato inconsistente
4. **TypeScript:** Errores de tipos
5. **Lint-staged:** Validaciones incrementales

**Qué hacer si el hook falla:**

```bash
# 1. Leer el error
git commit -m "feat: nueva funcionalidad"
# Hook muestra el error específico

# 2. Corregir el problema
npm run lint --fix
npm run format
npm run typecheck

# 3. Intentar de nuevo
git add .
git commit -m "feat: nueva funcionalidad"
```

---

## 📋 Hooks Instalados

| Hook                      | Archivo                          | Propósito                            | Status    |
| ------------------------- | -------------------------------- | ------------------------------------ | --------- |
| `pre-commit-branch-check` | `.husky/pre-commit-branch-check` | Bloquea commits directos en master   | ✅ Activo |
| `pre-commit`              | `.husky/pre-commit`              | Valida código antes de commit        | ✅ Activo |
| `pre-push-safety`         | `.husky/pre-push-safety`         | Bloquea push sin rebase + force push | ✅ Activo |
| `pre-push`                | `.husky/pre-push`                | Ejecuta validaciones antes de push   | ✅ Activo |
| `pre-checkout`            | `.husky/pre-checkout`            | Bloquea checkout con cambios         | ✅ Activo |
| `post-checkout`           | `.husky/post-checkout`           | Advierte master desincronizado       | ✅ Activo |
| `pre-rebase`              | `.husky/pre-rebase`              | Bloquea rebase con cambios           | ✅ Activo |
| `commit-msg`              | `.husky/commit-msg`              | Valida formato de mensajes           | ✅ Activo |

---

## 🚨 Casos de Emergencia

### "Necesito hacer push urgente y el hook falla"

**❌ NO HACER:**

```bash
git push --no-verify  # BLOQUEADO
```

**✅ HACER:**

1. Identificar qué validación falla
2. Corregir el problema específico
3. Hacer push normal

**Si es un error del hook (muy raro):**

1. Reportar al equipo inmediatamente
2. Crear un hotfix para el hook
3. Nunca usar `--no-verify` como workaround

### "El hook está roto y bloquea todo"

**Pasos:**

1. Verificar que el problema es del hook, no de tu código
2. Revisar `.husky/` para identificar el hook problemático
3. Crear un issue en GitHub con detalles
4. Temporalmente, puedes comentar la línea problemática en el hook
5. Crear un PR para arreglar el hook

**Ejemplo:**

```bash
# En .husky/pre-commit, comentar temporalmente:
# npm run lint:check  # TEMPORALMENTE DESHABILITADO - Issue #123
```

---

## 🔧 Cómo Funcionan los Hooks

### 1. Pre-commit-branch-check

```bash
# Detecta rama actual
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Bloquea si es master/main/production/prod
if [ "$current_branch" = "master" ]; then
  echo "❌ ERROR: Direct commits to 'master' are not allowed!"
  exit 1
fi
```

### 2. Pre-push-safety

```bash
# Check 1: Verifica rebase
merge_base=$(git merge-base HEAD origin/master)
origin_master_sha=$(git rev-parse origin/master)

if [ "$merge_base" != "$origin_master_sha" ]; then
  echo "❌ ERROR: Branch is not rebased on latest origin/master!"
  exit 1
fi

# Check 2: Detecta force push
if ! git merge-base --is-ancestor "$remote_sha" "$local_sha"; then
  echo "❌ ERROR: Force push detected!"
  exit 1
fi
```

### 3. Pre-checkout

```bash
# Detecta cambios sin commitear
if ! git diff-index --quiet HEAD --; then
  echo "❌ ERROR: Uncommitted changes detected!"
  git status --short
  exit 1
fi
```

### 4. Post-checkout

```bash
# Compara master local vs remoto
local_sha=$(git rev-parse master)
remote_sha=$(git rev-parse origin/master)

if [ "$local_sha" != "$remote_sha" ]; then
  echo "⚠️  WARNING: Your local master is out of sync!"
  echo "Press Enter to continue or Ctrl+C to abort..."
  read -r
fi
```

### 5. Pre-rebase

```bash
# Detecta cambios sin commitear antes de rebase
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ ERROR: You have uncommitted changes!"
  exit 1
fi
```

---

## 🧪 Probar los Hooks

### Test 1: Bloqueo de Commit en Master

```bash
git checkout master
echo "test" > test.txt
git add test.txt
git commit -m "test: should fail"

# Esperado:
# ❌ ERROR: Direct commits to 'master' are not allowed!
```

### Test 2: Bloqueo de Push sin Rebase

```bash
git checkout -b test/no-rebase
git reset --hard HEAD~3
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push -u origin test/no-rebase

# Esperado:
# ❌ ERROR: Branch is not rebased on latest origin/master!
```

### Test 3: Bloqueo de Force Push

```bash
git checkout -b test/force
echo "test" > test.txt
git add test.txt
git commit -m "test"
git push -u origin test/force
git commit --amend --no-edit
git push --force origin test/force

# Esperado:
# ❌ ERROR: Force push detected!
```

### Test 4: Bloqueo de Checkout con Cambios

```bash
echo "test" > test.txt
git checkout master

# Esperado:
# ❌ ERROR: Uncommitted changes detected!
```

### Test 5: Advertencia Master Desincronizado

```bash
git checkout master
git reset --hard HEAD~2
git checkout -b test/branch
git checkout master

# Esperado:
# ⚠️  WARNING: Your local master is out of sync with origin/master!
```

---

## 📚 Referencias

- **Git Workflow:** `.kiro/steering/60-git-workflow-rebase.md`
- **Rebase Migration:** `.kiro/steering/REBASE_WORKFLOW_MIGRATION.md`
- **Comparison:** `.kiro/steering/GIT-WORKFLOW-COMPARISON.md`
- **Safe Aliases:** `.git-safe-aliases.sh`

---

## ✅ Beneficios de los Safety Hooks

1. **Previene errores costosos:** Bloquea comandos destructivos antes de que causen daño
2. **Mantiene historial limpio:** Evita merge commits innecesarios
3. **Protege el trabajo del equipo:** Previene sobrescritura accidental
4. **Fuerza buenas prácticas:** Obliga a usar comandos seguros
5. **Educación continua:** Mensajes de error enseñan el comando correcto
6. **Enforcement automático:** Hace IMPOSIBLE no seguir la estrategia de rebase

---

## 📊 Nivel de Enforcement

**my-social-agents:** 🔒🔒🔒🔒🔒 (5/5) - Enforcement Máximo

```
✅ Bloquea commits en master
✅ Bloquea checkout con cambios
✅ Advierte master desincronizado
✅ Bloquea push sin rebase
✅ Bloquea force push
✅ Bloquea rebase con cambios
✅ Valida código pre-commit
✅ Valida código pre-push
✅ Valida mensajes de commit
```

---

**Last Updated:** January 12, 2026  
**Status:** ✅ Active - Maximum Security Mode  
**Enforcement Level:** 🔒🔒🔒🔒🔒 (5/5)
