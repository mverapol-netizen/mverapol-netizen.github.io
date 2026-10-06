# La Forja — fuente editorial Astro

Esta carpeta es la fuente mantenible de La Forja. GitHub Actions compila su contenido y reemplaza únicamente la carpeta pública `/la-forja/`.

## Publicar sin riesgo

Todo contenido nuevo debe comenzar con:

```yaml
draft: true
```

Mientras `draft` sea `true`, el texto no aparece en portada, secciones, búsqueda, temas, RSS, sitemap, autores ni archivo. Para publicar, cambiarlo a:

```yaml
draft: false
```

y hacer commit/push. GitHub Actions valida el esquema y solo publica si el build termina correctamente.

## Carpetas

- `src/content/articulos/`: columnas, ensayos y editoriales.
- `src/content/autores/`: autores.
- `src/content/debates/`: debates.
- `src/content/cuadernos/`: educación popular.
- `src/content/numeros/`: números de la revista.
- `templates/`: archivos base para crear contenido nuevo.
- `public/images/`: fotografías, afiches, grabados e ilustraciones propias o con licencia adecuada.
- `src/pages/`: rutas y páginas generadas.
- `src/styles/`: sistema visual.

## Imágenes editoriales

Si no se define `image`, La Forja genera automáticamente una composición gráfica usando `artStyle`.

Para utilizar una imagen real:

```yaml
image: "/images/articulos/mi-imagen.webp"
imageAlt: "Descripción accesible."
imageCredit: "Crédito o fuente."
imageTreatment: "red"
```

Tratamientos disponibles: `bw`, `red`, `blue`, `natural`.

## Número actual

El encabezado global ya no está escrito a mano. Se obtiene del archivo de `src/content/numeros/` que tenga:

```yaml
status: "actual"
draft: false
```

Al cambiar el número actual, la cabecera de toda la revista se actualiza automáticamente.

## Flujo recomendado

1. Copiar una plantilla desde `templates/`.
2. Crear el archivo Markdown en la colección correspondiente.
3. Mantener `draft: true` durante edición y revisión.
4. Hacer commits normalmente; el borrador seguirá invisible al público.
5. Cuando el texto esté aprobado, cambiar a `draft: false`.
6. Push a `main`.
7. GitHub Actions compila y publica automáticamente.

## Desarrollo local

```bash
npm install
npm run dev
npm run build
```
