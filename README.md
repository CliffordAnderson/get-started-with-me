# getstartedwith.me

```
index.html              landing page and lesson index
lessons/perceptron.html lesson 1 — one unit, two inputs
lessons/images.html     lesson 2 — one unit, 144 pixel inputs
lessons/xor.html        lesson 3 — where one unit runs out
assets/site.css         all shared styling
assets/lesson.js        shared plotting and panel machinery
```

## Adding a lesson

1. Copy an existing lesson as a starting point. `perceptron.html` is the simplest of the three.
2. Give each panel a `<section id="…" class="panel" role="tabpanel" aria-labelledby="tab-…">`
   and end the inline script with:

   ```js
   initPanels([["intro","What it is"], ["…","…"]]);
   ```

   The rail, the prev/next pager, deep links and the numbering are generated from that list.
3. Add an entry to `index.html`. Copy an existing `<a class="entry">` block, change the
   number, title, description and thumbnail SVG.
4. Point the previous lesson's `<a class="nextup">` at the new file, and point the new
   lesson's `nextup` at whatever follows it — the next lesson, or `../index.html` if it is
   the last one.
5. Inserting rather than appending also means renumbering: the `entry-num` on every later
   entry, the new lesson's `lesson N ·` kicker, the last lesson's "Lesson N of M" label, and
   the sentences at the end of each lesson that describe what the next one does. Grep for
   `next lesson` and `last lesson` when you are finished.

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
- Sample data is generated from a seeded PRNG rather than checked in, so a lesson can draw
  as many fresh examples as it needs and a held-out set is genuinely held out. `images.html`
  keeps its picture generator and its 12×12 canvas painters inline, since nothing else uses
  them; only machinery shared by more than one lesson belongs in `assets/lesson.js`.
- One trained model per lesson, in a single mutable object the panels all read. A panel that
  retrains it changes what the later panels show, which is the honest behaviour — panels that
  can be reached with an untrained model say so rather than reporting a meaningless score.
