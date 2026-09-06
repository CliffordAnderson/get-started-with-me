# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static site of short interactive machine-learning lessons. No build step, no dependencies,
no framework, no tests: hand-written HTML, one shared stylesheet, one shared script. Every
page opens directly from the filesystem.

`README.md` documents the drawing API in `assets/lesson.js` function by function. This file
covers the things that need more than one file to see.

## Commands

```
open index.html                 preview (file:// works; no server needed)
node --check assets/lesson.js   the only syntax check available
npx wrangler deploy             wrangler.jsonc serves the repo root as static assets
```

There is no linter, no test runner and no package.json. `npx wrangler` is the only tooling,
and it is not installed locally. A deploy publishes the live site, so run it only when asked.

## Verifying a change

The site's central claim is that nothing is precomputed — if a lesson says a search found no
answer, the search ran in the browser. That makes verification part of authoring rather than
an afterthought: **measure what the code does before writing a sentence about it.** Two
techniques that work well here:

*Run the lesson's own logic under Node.* The inline scripts are plain browser JS. Slice out
the section above the painting helpers, prepend stubs for the few things it borrows from
`lesson.js` (`step`, `clamp`, `lerp`), append a `module.exports`, and require it. This tests
the shipped code rather than a retyped copy of it, which matters — a lesson's prose quotes
specific numbers, and a copy drifts.

*Check rendering with headless Chrome.*

```
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --virtual-time-budget=5000 --dump-dom file://$PWD/lessons/x.html
"$CHROME" --headless --disable-gpu --hide-scrollbars --virtual-time-budget=6000 \
  --window-size=1400,5200 --screenshot=out.png file://$PWD/lessons/x.html
```

If `initPanels` ran, the generated `id="tab-*"` buttons appear in the DOM dump; if the script
threw, they do not — that alone is a fast smoke test. Computed readouts appear in the dump
too, so you can confirm a panel calculated real numbers.

Screenshots need a trick: only the active panel is displayed. To see everything at once, work
on a **temporary copy** and inject `body.js-panels .panel{display:block !important}`. Delete
the copy afterwards. Do look at the screenshots — canvas drawings can be geometrically correct
and still illegible, which is invisible from the DOM.

## Architecture

Each lesson is one self-contained HTML file: content in markup, all behaviour in a single
inline `<script>` at the bottom, one IIFE per panel. `assets/lesson.js` holds only machinery
shared by more than one lesson; anything used by a single lesson stays inline, however
reusable it looks. (`images.html` keeps its picture generator and its 12×12 canvas painters
inline for exactly this reason.)

Three conventions are load-bearing and easy to break:

- **Every plot must push a callback onto `redraws`.** Canvases inside a hidden panel measure
  zero, so a plot that skips this renders one pixel wide the moment its panel opens.
  `initPanels` calls them on each panel change; the boot code calls them on resize and on
  `document.fonts.ready`.
- **`initPanels([...])` must be the last statement in the script.** It shows the first panel,
  which fires every registered redraw, so every IIFE must already have run.
- **Animations pause when their panel is hidden.** Listen for `panelshow` on `document` and
  compare `e.detail` against your panel id.

The rail, prev/next pagers, deep links and section numbering are all generated from the
`initPanels` list, so panel order lives in exactly one place.

## The palette is semantic

`--off` blue is class 0, `--on` brown is class 1, `--alert` red marks a mistake. `drawPoint`
draws class 0 as a blue ring and class 1 as a brown square. Keep that mapping in anything new
— a diverging weight image, for instance, goes blue on the negative side and brown on the
positive, so it reads against the scatter plots without a second explanation.

## Example data

Generated in the browser from a seeded PRNG rather than checked in. This is what lets a lesson
draw as many fresh examples as it wants and keeps a held-out set genuinely held out — see
`makeSet` in `images.html`, where training and test sets come from disjoint seed ranges. Never
inline a precomputed result to save the work.

## Inserting a lesson in the middle

Appending is easy; inserting touches more than you would expect, and the compiler cannot help:

- `index.html`: the new `<a class="entry">` block, plus `entry-num` on every later entry
- the new file's kicker (`lesson N · title`)
- `nextup` links in both directions, and the final lesson's "Lesson N of M" label
- **prose forward references** — lessons end by saying what the next one does, in sentences
  that name its subject. Those go silently wrong when the order changes. Grep for
  `next lesson` and `last lesson` after any renumbering.

## The glossary

`glossary.html` is not a lesson: one alphabetical entry per technical term, each
a plain paragraph then an `.exact` one, then the lessons it appears in and a Wikipedia link.
Lessons link a term on its **first mention only**, `<a class="term" href="../glossary.html#id">`.
That restraint is deliberate — the prose carries the teaching, and a paragraph strewn with
links stops reading like prose. Adding a term touches three places: the entry, the
`.gloss-jump` nav, and the first mention in each lesson that uses it.

Check outbound links resolve before shipping them; a term with no good article says so rather
than pointing somewhere approximate.

## The about page

`about.html` carries the prose the landing page used to end with: what the lessons are, how to
read one, how the site was made, and who wrote it. The landing page is deliberately spare —
masthead, lesson list, footer — so that it stays short as lessons are added. Anything
explanatory that wants to go on `index.html` almost certainly belongs here instead.

Its `#made` section says plainly that the site was co-created with an AI rather than written
by one hand, and the footer of the landing page says the same in one sentence. Every other
page links to `about.html` from the topbar; a new page gets that link too. Keep the section as
specific as it is — the general admission is cheap and worth little, and what carries it is
the named example of a measurement overturning a drafted claim, which is the practice the
rest of this file is about.

The landing page states no lesson count, on purpose. `every lesson fifteen minutes or less` in
the masthead is a claim about the entry metas below it, so it has to stay true of the slowest
lesson.

## Voice

Lessons are written, not templated, and the prose carries as much of the teaching as the
interactions. Long literary sentences, em dashes, British spellings (*labelled*,
*neighbouring*, *cancelled*). Second person for what the reader does, never for what the
machine does. There is not an exclamation mark or a bulleted list anywhere in the lessons,
and no hype about the technology; keep it that way.

The register is that of an honest instrument, and it is worth protecting:

- State limits as plainly as capabilities. Lesson 1's fourth panel is titled *What the rule
  guarantees, and what it doesn't*; lesson 2 ends by breaking its own classifier.
- Flag artificiality where it would otherwise mislead. `images.html` says outright that its
  animals are generated drawings and that a high score on them is not evidence about
  photographs.
- Historical claims go in a `.cite` block with a real citation, and stay modest about what
  the cited work actually argued.
- Every canvas needs `role="img"` and an `aria-label` saying what it shows; every figure gets
  a `figcaption`. `prefers-reduced-motion` sends page-load animations straight to their end
  state via the `REDUCE` flag.
