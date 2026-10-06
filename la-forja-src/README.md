# La Forja — fuente Astro

Esta carpeta contiene la versión mantenible de La Forja. La maqueta pública vive actualmente en `/la-forja/`; esta fuente se desarrolla en paralelo hasta reemplazarla.

## Contenido
- `src/content/articulos/`: columnas, ensayos y editoriales.
- `src/content/autores/`: fichas de autor.
- `src/content/debates/`: debates colectivos.
- `src/content/cuadernos/`: educación popular.
- `src/pages/`: páginas generadas.
- `src/styles/`: sistema visual.

## Flujo editorial
1. Crear o editar un archivo Markdown.
2. Revisar metadatos.
3. Commit.
4. GitHub Actions comprueba que Astro compile.
5. Build estático y publicación.

## Desarrollo
`npm install` · `npm run dev` · `npm run build`
