# Lesson 8: word vectors — September 2026

- Added `lessons/vectors.html`: distributional word vectors counted from the corpus lesson 7
  ships. Five panels — follower rows the table cannot compare, positional profiles reweighted
  by surprise and compared by cosine, a two-direction map of the 1,449 profiled words, the
  chapter-ten prediction walk rerun with neighbours voting where the table is silent, and an
  inventory of what counting cannot reach.
- Moved the shared novel out of lesson 7's `text/plain` blocks into `assets/corpus-trial.js`
  (two string constants, unchanged text), since two lessons now read it. Lesson 7's behaviour
  and all of its checked numbers are unchanged.
- Added glossary entries for cosine similarity, the distributional hypothesis and word vector;
  extended the numerical checks to cover every number lesson 8's prose quotes, including the
  borrowing gains (503 borrowed answers, 42 exactly right) and the map's determinism.
- Verified in headless Chrome: all five panels compute, the browser walk reproduces the Node
  numbers exactly, and map labels stack legibly instead of overlapping. Screen-reader and
  manual mobile testing were not performed.

# Review update — September 2026

- Corrected claims about finite training budgets, neural-network confidence, interpretability,
  smooth loss surfaces and zero action values; aligned related glossary entries.
- Added a prediction and takeaway to every panel, optional mathematical foundations for
  backpropagation, and realistic reading-time guidance.
- Added definitions within the lesson, continuous reading, section progress, print styles,
  keyboard focus management, settled-result announcements and selected chart-data tables.
- Improved navigation wrapping and touch scrolling; added numeric point entry, pixel-selection
  keys and a selector covering all valid reward positions.
- Added visible batch seeds, repeatable runs, cooperative batch progress and continuation of the
  same unfinished backpropagation networks to a 20,000-epoch budget.
- Added generated offline glossary data, documentation and dependency-free verification scripts.

Validation: nine HTML pages passed reference/structure checks; eight JavaScript scripts passed
syntax checks; 64 generated definitions matched the glossary. Numerical regression checks passed,
including late successes at epochs 3,624 and 3,412. Browser and screen-reader testing was not performed.

The site remains a static site that opens directly from `index.html`. No deployment was performed.

## RL rendering correction

Hidden grids were measured as one pixel. Subtracting the drawing margins produced a negative
cell size and a negative agent-circle radius, which aborted the shared redraw loop. Grid geometry
now clamps the inner size to zero and skips drawing until there is room for cells. The visible
panel can then be resized and painted normally. Added a regression check for hidden/undersized
grids followed by a visible-grid redraw. The numerical learning rule is unchanged.
