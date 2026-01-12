# Auto-Rebase System

Sistema completo de rebase automático para mantener las ramas actualizadas con master.

## 📋 Componentes

### 1. Pre-Push Auto-Rebase (Local)

**Archivo:** `.husky/pre-push-auto-rebase`

**Cuándo se ejecuta:** Antes de cada `git push`

**Qué hace:**

- Verifica si tu rama está detrás de `origin/master`
- Si está detrás, te pregunta si quieres hacer rebase automático
- Opciones:
  1. **Auto-rebase ahora** (recomendado) - Hace el rebase automáticamente
  2. **Skip** - Continúa sin rebase (fallará en pre-push-safety)
  3. **Cancelar** - Cancela el push

**Ejemplo de uso:**

```bash
git push origin feature/my-branch

# Output:
# 🔄 Auto-rebase: Checking if rebase is needed...
# 📊 Branch status:
#    Current branch: feature/my-branch
#    Commits behind master: 3
#    Commits ahead of master: 2
#
# 🤔 Your branch needs to be rebased on origin/master
#
# Options:
#   1. Auto-rebase now (recommended)
#   2. Skip and push anyway (will fail in pre-push-safety)
#   3. Cancel push
#
# Choose option (1/2/3): 1
#
# 🔄 Starting automatic rebase...
# ✅ Rebase completed successfully!
```

**Ventajas:**

- ✅ Interactivo - tú decides si hacer rebase
- ✅ Detecta conflictos antes de push
- ✅ Te guía en caso de conflictos
- ✅ Previene push sin rebase

---

### 2. Pre-Push Safety (Local)

**Archivo:** `.husky/pre-push-safety`

**Cuándo se ejecuta:** Después de pre-push-auto-rebase, antes de pre-push

**Qué hace:**

- **Bloquea** el push si la rama no está rebased en `origin/master`
- Verifica que uses `--force-with-lease` (no `--force`)
- Muestra instrucciones claras si falla

**Ejemplo de bloqueo:**

```bash
git push origin feature/my-branch

# Output:
# ❌ ERROR: Branch is not rebased on latest origin/master!
#
# 🚫 BLOCKED: Your branch is behind origin/master
#
# ✅ REQUIRED STEPS:
#    1. Fetch latest master: git fetch origin
#    2. Rebase your branch: git rebase origin/master
#    3. Resolve conflicts if any
#    4. Push with force-with-lease: git push --force-with-lease origin feature/my-branch
```

---

### 3. Auto-Rebase PR (GitHub Actions)

**Archivo:** `.github/workflows/auto-rebase-pr.yml`

**Cuándo se ejecuta:**

- Cuando se abre un PR
- Cuando se actualiza un PR
- Cuando se hace push a master (rebasea todos los PRs abiertos)
- Manualmente con `/rebase` en comentario del PR
- Manualmente desde GitHub Actions UI

**Qué hace:**

- Detecta si el PR está detrás de master
- Hace rebase automático del PR
- Pushea los cambios con `--force-with-lease`
- Comenta en el PR el resultado (éxito o conflictos)

**Ejemplo de comentario en PR:**

```
✅ Auto-rebase successful!

This PR has been automatically rebased on `master`.

📊 Commits behind: 3

🤖 Rebased by GitHub Actions
```

**Si hay conflictos:**

````
❌ Auto-rebase failed with conflicts

This PR cannot be automatically rebased on `master` due to conflicts.

Manual rebase required:
```bash
git fetch origin
git rebase origin/master
# Resolve conflicts
git add <resolved-files>
git rebase --continue
git push --force-with-lease origin feature/my-branch
````

🤖 Attempted by GitHub Actions

````

---

## 🔄 Flujo Completo

### Escenario 1: Push Local

```bash
# 1. Haces cambios en tu rama
git add .
git commit -m "feat: new feature"

# 2. Intentas hacer push
git push origin feature/my-branch

# 3. Pre-push-auto-rebase detecta que estás detrás de master
# 🔄 Auto-rebase: Checking if rebase is needed...
# 📊 Branch status:
#    Commits behind master: 2
#
# Choose option (1/2/3): 1

# 4. Hace rebase automático
# ✅ Rebase completed successfully!

# 5. Pre-push-safety verifica que estés rebased
# ✅ Branch is properly rebased on origin/master

# 6. Pre-push ejecuta lint, format, typecheck
# ✅ Pre-push checks passed!

# 7. Push exitoso
# ✅ Push completed!
````

---

### Escenario 2: PR Automático

```bash
# 1. Creas un PR en GitHub
gh pr create --base master --head feature/my-branch

# 2. GitHub Actions detecta el PR nuevo
# 🔄 Auto-rebase workflow triggered

# 3. Verifica si está detrás de master
# 📊 PR is 2 commits behind master

# 4. Hace rebase automático
# ✅ Rebase successful!

# 5. Pushea los cambios
# 📤 Pushing rebased branch...

# 6. Comenta en el PR
# ✅ Auto-rebase successful!
```

---

### Escenario 3: Master Actualizado

```bash
# 1. Alguien mergea un PR a master
# (otro PR se mergea)

# 2. GitHub Actions detecta push a master
# 🔍 Checking all open PRs...

# 3. Encuentra PRs abiertos que necesitan rebase
# Found 3 eligible PRs to rebase
#   - PR #29: refactor/query-response
#   - PR #30: feature/new-feature
#   - PR #31: fix/bug-fix

# 4. Dispara rebase para cada PR
# ✅ Rebase triggered for PR #29
# ✅ Rebase triggered for PR #30
# ✅ Rebase triggered for PR #31

# 5. Cada PR se rebasea automáticamente
# (workflows individuales se ejecutan)
```

---

## 🎯 Configuración

### Usuarios Autorizados

Edita los archivos para agregar usuarios autorizados:

**Local (pre-push-auto-rebase):**

```bash
# No requiere configuración - funciona para todos
```

**GitHub Actions (auto-rebase-pr.yml):**

```yaml
env:
  AUTHORIZED_AUTHORS: 'cryptoganster,otro-usuario,tercer-usuario'
```

---

## 🚀 Comandos Útiles

### Trigger Manual de Rebase en PR

**Opción 1: Comentario en PR**

```
/rebase
```

**Opción 2: GitHub Actions UI**

1. Ve a Actions → Auto Rebase PR
2. Click en "Run workflow"
3. Ingresa el número del PR
4. Click en "Run workflow"

### Deshabilitar Auto-Rebase Local

Si no quieres el prompt interactivo:

```bash
# Opción 1: Skip con variable de entorno
SKIP_AUTO_REBASE=1 git push origin feature/my-branch

# Opción 2: Usar --no-verify (no recomendado)
git push --no-verify origin feature/my-branch
```

---

## 📊 Comparación

| Aspecto         | Pre-Push Auto-Rebase | Auto-Rebase PR                              |
| --------------- | -------------------- | ------------------------------------------- |
| **Dónde**       | Local (tu máquina)   | GitHub Actions (cloud)                      |
| **Cuándo**      | Antes de push        | Cuando se abre/actualiza PR o master cambia |
| **Interactivo** | Sí (te pregunta)     | No (automático)                             |
| **Conflictos**  | Te guía localmente   | Comenta en PR                               |
| **Velocidad**   | Inmediato            | 1-2 minutos                                 |
| **Requiere**    | Git local            | Nada (automático)                           |

---

## ✅ Ventajas del Sistema

1. **Prevención Proactiva**
   - Pre-push detecta problemas antes de push
   - No llegas a GitHub con rama desactualizada

2. **Automatización Inteligente**
   - PRs se mantienen actualizados automáticamente
   - No necesitas recordar hacer rebase

3. **Seguridad**
   - Usa `--force-with-lease` (no `--force`)
   - Verifica que estés rebased antes de push
   - Bloquea operaciones peligrosas

4. **Visibilidad**
   - Comentarios en PRs sobre rebase
   - Logs claros en cada paso
   - Instrucciones cuando falla

5. **Flexibilidad**
   - Puedes elegir hacer rebase o no (local)
   - Puedes trigger manual (PR)
   - Puedes deshabilitar si necesitas

---

## 🐛 Troubleshooting

### "Rebase failed with conflicts"

**Local:**

```bash
# 1. Resuelve conflictos manualmente
git status  # Ver archivos con conflictos
# Edita los archivos

# 2. Marca como resueltos
git add <archivo-resuelto>

# 3. Continúa el rebase
git rebase --continue

# 4. Push con force-with-lease
git push --force-with-lease origin feature/my-branch
```

**PR:**

- GitHub Actions comentará en el PR con instrucciones
- Sigue las instrucciones del comentario
- Después de resolver, el PR se actualizará automáticamente

### "Pre-push-safety blocks my push"

Esto significa que tu rama no está rebased en master:

```bash
# 1. Fetch latest master
git fetch origin

# 2. Rebase tu rama
git rebase origin/master

# 3. Resuelve conflictos si hay

# 4. Push con force-with-lease
git push --force-with-lease origin feature/my-branch
```

### "Auto-rebase no se ejecuta en mi PR"

Verifica:

1. ¿Tu usuario está en `AUTHORIZED_AUTHORS`?
2. ¿El PR es draft? (no se rebasean drafts)
3. ¿El workflow está habilitado en GitHub?

---

## 📝 Notas Importantes

1. **Siempre usa `--force-with-lease`**, nunca `--force`
2. **Commits locales** deben estar pusheados antes de rebase
3. **Conflictos** requieren resolución manual
4. **Draft PRs** no se rebasean automáticamente
5. **Master** nunca se rebasea (protegido)

---

**Última actualización:** 2025-01-12
**Versión:** 1.0
**Estado:** Activo ✅
