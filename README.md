# getstartedwith.me

```
index.html              landing page and lesson index
about.html              what the lessons are, how the site was made, who wrote it
glossary.html           every technical term, explained plainly, linked to Wikipedia
lessons/perceptron.html lesson 1 — one unit, two inputs
lessons/images.html     lesson 2 — one unit, 144 pixel inputs
lessons/xor.html        lesson 3 — where one unit runs out
lessons/backprop.html   lesson 4 — where the weights come from
lessons/mycin.html      lesson 5 — knowledge written down instead of learned
lessons/rl.html         lesson 6 — learning from delayed rewards
lessons/nextword.html   lesson 7 — a language model built from counting
lessons/vectors.html    lesson 8 — words as points, from the same novel
assets/site.css         all shared styling
assets/lesson.js        shared plotting, panels and reading/experiment tools
assets/glossary-data.js generated offline definitions
assets/corpus-trial.js  the fixed corpus shared by lessons 7 and 8
scripts/               dependency-free source and numerical checks
```

## Adding a lesson

1. Copy an existing lesson as a starting point. `perceptron.html` is the simplest of them.
2. Give each panel a `<section id="…" class="panel" role="tabpanel" aria-labelledby="tab-…">`
   and end the inline script with:

   ```js
   initPanels([["intro","What it is"], ["…","…"]]);
   ```

   The rail, the prev/next pager, deep links and the numbering are generated from that list.
3. Add an entry to `index.html`. Copy an existing `<a class="entry">` block, change the
   number, title, description and thumbnail SVG. Give the new lesson's topbar the same
   `Glossary` and `About` links every other page carries. Keep the reading-time estimate realistic and separate it from time spent experimenting.
4. Point the previous lesson's `<a class="nextup">` at the new file, and point the new
   lesson's `nextup` at whatever follows it — the next lesson, or `../index.html` if it is
   the last one.
5. Inserting rather than appending also means renumbering: the `entry-num` on every later
   entry, the new lesson's `lesson N ·` kicker, the last lesson's "Lesson N of M" label, and
   the sentences at the end of each lesson that describe what the next one does. Grep for
   `next lesson` and `last lesson` when you are finished.

## The glossary

`glossary.html` holds one entry per technical term: a plain-language paragraph first, a
shorter `.exact` paragraph for the precise meaning, then a `.gloss-meta` line giving the
lessons it appears in and a link to Wikipedia. Entries are alphabetical and each carries a
kebab-case `id`, which is what the lessons link to.

Lessons link a term **on its first mention only**, as
`<a class="term" href="../glossary.html#weight">weight</a>`. The style is a dotted underline
in the running text colour, so the prose stays calm; linking every occurrence makes a lesson
look like a spiderweb. Adding a term means adding the entry, adding it to the `.gloss-jump`
nav at the top, and linking it in whichever lessons use it.

Where a term has no Wikipedia article of its own — `epoch` is the one so far — the entry says
so in place of the link rather than pointing at an article that does not discuss it.

## What `assets/lesson.js` gives you

`Plot(canvas, [xmin,xmax,ymin,ymax])` wraps a canvas with data-space coordinates and
device-pixel-ratio handling: `p.X(v)` and `p.Y(v)` map data to pixels, `p.iX`/`p.iY` map back,
`p.fit()` re-measures after a resize.

- `field(p, xLabel, yLabel)` — the grid, axes and labels every plot starts with.
- `drawBoundary(p, w1, w2, b, opts)` — the shaded half-plane and the line `w·x + b = 0`.
- `drawPoint(p, x, y, cls, wrong, label, r)` — a class marker; `cls` 0 is a ring, 1 a square.
- `drawArrow(p, ax, ay, bx, by, color)` — an arrow in data coordinates.
- `bestLine(points, labels)` — the best straight boundary over a small set, by a search over 720 directions
  with a max-margin tiebreak within that sampled set; this is not an exact separability proof. Returns `{score, margin, w1, w2, b}`.
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
  Lessons 7 and 8 are the one place raw data ships with a page: their corpus is a fixed
  novel (*The Trial*, Wyllie translation, Project Gutenberg ebook 7849), held in
  `assets/corpus-trial.js` as two string constants because two lessons share it. Every
  table and every profile is counted from `CORPUS_TRAIN` in the browser; `CORPUS_HELD`
  is chapter ten, read only to measure predictions, never to make them, so it stays held
  out. The Gutenberg attribution in both lessons' footers is a license condition; keep it.
- One trained model per lesson, in a single mutable object the panels all read. A panel that
  retrains it changes what the later panels show, which is the honest behaviour — panels that
  can be reached with an untrained model say so rather than reporting a meaningless score.

## Reading and accessibility

Each lesson has a section counter and a **Show all sections** switch. Printing reveals
all panels, with a redraw before printing so previously hidden plots have useful dimensions.
Next/Previous moves keyboard focus into the newly shown section. The full glossary opens
in another tab; first-mention terms open a native dialog in the lesson, with Escape/Close
returning focus to the term. Neither route unloads the experiment. Browsers without dialog
support retain the ordinary glossary link.

Definitions are generated from `glossary.html` and loaded as a classic script, so the same
code works from `file://` and from a static host. After glossary edits, run:

```bash
python3 scripts/build-glossary.py
```

Keep `assets/glossary-data.js` in the distributed site. It is generated content, not a second
place to edit definitions. Reading tools use no server, account, or browser storage.

Only canvases that support continuous dragging use `touch-action: none`; passive charts
allow vertical scrolling. Point entry has numeric controls, the pixel inspector has arrow-key
selection, and the changed-reward grid has a selector for every valid prize position.

`figureTable` exposes chart values as an expandable HTML table. Tables cover the backpropagation
restart histogram and inspected hidden-space snapshot, and the reinforcement-learning
histogram, action-value table and exploration results. Other figures retain their captions,
labels and existing numerical readouts. This is not a claim of full screen-reader equivalence
for every visualisation. Result announcements are debounced to avoid reading every animation frame.

## Repeatable experiments

The backpropagation restart batch and the reinforcement-learning batches have an editable
**Experiment seed**. The same seed and settings repeat a batch; **New seed** chooses the next
seed. The random-walk button replaces its previous batch, rather than accumulating it.
Backpropagation and reinforcement learning also have a starting-seed restart control;
this reloads and clears the lesson. Reproduce interactive runs by following the same controls
in the same order. Seeds describe the random choices, not a saved snapshot of all user actions.

Long batches use `runChunks`, which yields between small groups of synchronous calculations.
The panel's controls are disabled while a batch is active and restored on completion; the
section rail remains available. These are cooperative main-thread batches, not Web Workers,
so no additional hosting requirements are introduced.

The backpropagation success criterion is **all four cases correct and total error below 0.02**.
The initial budget is 2,000 epochs. **Continue unfinished runs to 20,000 epochs** continues the
same model objects, rather than starting new ones. Neither cutoff proves permanent failure.
Seeds 1–200 currently yield 41 initial unfinished runs; seeds 16 and 101 subsequently meet
the criterion at 3,624 and 3,412 epochs. This is a reproducible regression case, not a statement
about every batch's failure rate.

## Checks

No installation or build is required to use the site. Python 3 and Node are required only for
these optional authoring checks:

```bash
python3 scripts/check-site.py
node scripts/test-math.cjs
```

The first checks local references, anchors, panel order, learning prompts, generated definitions
and JavaScript syntax. The second runs the shipped mathematical engines: all nine gradient
components against numerical derivatives, late training successes, zero-weight symmetry,
seed reproducibility, the eight-move route, its discounted value and the distinction between
an untried action and a tried action still valued at zero. It also checks that hidden-grid geometry
never supplies a negative canvas radius or prevents the following visible-grid redraw. For
lesson 7 it verifies the corpus split and every number the prose quotes — table sizes,
forced-continuation shares, verbatim-quotation shares at fixed seeds, the collapse of
prediction accuracy on the held-out chapter, and the hero caption's claim that every
three-word run of a generated passage occurs in the novel.

The supplied update passed these checks. Browser rendering and assistive-technology behavior
have not been manually verified. Before publishing, check the dialog, focus changes, reading
mode, printing and controls in your target desktop/mobile browsers.
