---
name: git-spanish-commits
description: Flujo de trabajo y convenciones estrictas para el uso de Git en este proyecto. Instrucciones sobre el idioma de los commits. SIEMPRE responder en español.
---

# Reglas de Git y Commits

Esta skill define el estándar estricto que debes seguir cada vez que se te pida crear código y guardarlo usando Git, o proponer mensajes de commit.

## REGLA CRÍTICA Y OBLIGATORIA (IDIOMA)

1. **TODOS LOS MENSAJES DE COMMIT DEBEN ESTAR EN ESPAÑOL.** Sin excepciones.
2. **SIEMPRE DEBES COMUNICARTE CON EL USUARIO EN ESPAÑOL.**

## Convenciones de Commits

Sigue el formato de _Conventional Commits_, pero traduciendo la descripción (y opcionalmente el tipo) al español:

- `feat:` (o `característica:`): Añade una nueva funcionalidad.
  - _Ejemplo:_ `feat: agregar soporte para múltiples idiomas`
- `fix:` (o `corrección:`): Soluciona un error o bug.
  - _Ejemplo:_ `fix: corregir cálculo de totales en el carrito`
- `docs:` (o `documentación:`): Cambios en la documentación.
  - _Ejemplo:_ `docs: actualizar el README con instrucciones de instalación`
- `style:` (o `estilo:`): Cambios de formato, comas, etc. (no afecta al código).
- `refactor:` (o `refactorización:`): Refactorización del código de producción.
- `chore:` (o `mantenimiento:`): Actualización de dependencias, configuraciones de build, etc.

**Estructura del mensaje:**

```
<tipo>: <descripción breve en español>

<cuerpo opcional con más detalles en español>
```

Nunca uses comandos o recomiendes commits en inglés para este proyecto.
