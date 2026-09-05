# getstartedwith.me

Static site, no build step. Open `index.html` directly or serve the folder from
anything (GitHub Pages, Netlify, `python3 -m http.server`). All links are relative.

```
index.html              landing page and lesson index
lessons/perceptron.html lesson 1
lessons/xor.html        lesson 2
assets/site.css         all shared styling
assets/lesson.js        shared plotting and panel machinery
```

## Adding a lesson

1. Copy an existing lesson as a starting point. `perceptron.html` is the simpler of the two.
2. Give each panel a `<section id="…" class="panel" role="tabpanel" aria-labelledby="tab-…">`
   and end the inline script with:

   ```js
   initPanels([["intro","What it is"], ["…","…"]]);
   ```

   The rail, the prev/next pager, deep links and the numbering are generated from that list.
3. Add an entry to `index.html`. Copy an existing `<a class="entry">` block, change the
   number, title, description and thumbnail SVG.
4. Point the previous lesson's `<a class="nextup">` at the new file, and make the new
   lesson's `nextup` link back to `../index.html`.

## What `assets/lesson.js` gives you

`Plot(canvas, [xmin,xmax,ymin,ymax])` wraps a canvas with data-space coordinates and
device-pixel-ratio handling: `p.X(v)` and `p.Y(v)` map data to pixels, `p.iX`/`p.iY` map back,
`p.fit()` re-measures after a resize.

- `field(p, xLabel, yLabel)` — the grid, axes and labels every plot starts with.
- `drawBoundary(p, w1, w2, b, opts)` — the shaded half-plane and the line `w·x + b = 0`.
- `drawPoint(p, x, y, cls, wrong, label, r)` — a class marker; `cls` 0 is a ring, 1 a square.
- `drawArrow(p, ax, ay, bx, by, color)` — an arrow in data coordinates.
- `bestLine(points, labels)` — the best straight boundary over a small set, by exact search
  with a max-margin tiebreak. Returns `{score, margin, w1, w2, b}`.
- `pointerPos(p, event)` — pointer position in data coordinates, for drag interactions.
- `step`, `sig`, `clamp`, `lerp`, `num`, `signed`, `plural`, `C` (the palette), `REDUCE`.

Push a redraw callback onto `redraws` for every plot you create. It is called on window
resize and whenever a panel becomes visible — canvases inside a hidden panel measure zero,
so a plot that does not register will render one pixel wide when its panel opens.

## Conventions worth keeping

- Nothing is precomputed. If a lesson claims a search found no answer, the search runs in
  the browser and reports what it found.
- Long-running animations pause when their panel is hidden; listen for the `panelshow`
  event on `document` and check `e.detail` against your panel id.
- Deep links are skipped when `history.replaceState` is unavailable, which is the case in
  an `about:srcdoc` preview. In-page links to `#panel-id` are intercepted and work anyway.
- `prefers-reduced-motion` is respected: page-load animations jump to their end state.
