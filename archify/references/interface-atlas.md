# Source interface atlases

Use this optional asset when a user wants related diagrams organized as an atlas,
key function interfaces documented, or node-local interface details. It supports
one or more existing Archify diagrams; it is not a source-code parser or a new
diagram type. Do not add this layer to ordinary diagrams by default.

## Choose views and facts

Keep each view focused on one question: structure, actions, call order, data
movement, or state. Choose the number of views from the evidence, not a template.
Share interface facts in one catalog; use stable `(diagram ID, node ID)` bindings.
An interface may appear in several views. Give same-named internal functions
different interface IDs when they are different real symbols.

Read the target repository without building or executing it. Record the bounded
revision/configuration and unknowns in `context`. Public library functions,
external ABIs, callbacks, internal/static helpers, and disabled paths are not
interchangeable; use `kind` and `notes` to preserve those distinctions. A mapping
means “relevant interfaces for this node”, not a new call edge or proof that the
function runs in that node's execution context. Put qualifications in the node's
`note`, especially for hardware, buffers, alternative implementations and hooks.

## Reusable assets

- [Catalog schema](../assets/interface-atlas/catalog.schema.json): independent
  sidecar format, **not** fields to insert into an Archify diagram specification.
- [Example catalog](../examples/interface-atlas/catalog.json) and its small
  illustrative header: replace sample facts with inspected project evidence.
- [Builder](../scripts/build-interface-atlas.mjs): zero-dependency Node script;
  validates input bindings and creates self-contained readers, an atlas entry,
  a searchable interface reference, Markdown, and a deterministic receipt.
- [Browser checker](../scripts/check-interface-atlas.mjs): optional Playwright
  checks for the final derived pages; no browser download or install is implicit.
- [Viewer assets](../assets/interface-atlas/viewer.mjs) and
  [styles](../assets/interface-atlas/viewer.css): reusable node-local disclosure,
  English/Chinese UI, search, keyboard access and deep links.

To try the packaged example without editing the installed Skill:

    node scripts/demo-interface-atlas.mjs /path/to/new-demo-directory

It copies the illustrative inputs into that new directory, delivers the native
base and generates the atlas entry. It does not install dependencies, open a
browser, or claim browser/visual approval. Use the checks below to finish review.

## Author and build

1. Author and validate each normal Archify JSON. For discoverability, include a
   short representative function in `sublabel` where it fits and `API N` in an
   existing `tag` field; sequence participants can use their `sublabel`. Do not
   squeeze full signatures/parameter tables into SVG boxes or shorten identifiers
   to repair geometry. Tags are optional; the toolbar's interface index always
   exposes mapped nodes. Validate the changed specifications normally.
2. `deliver` each native base and save its successful stdout JSON receipt. Keep
   the specification, native HTML and receipt together, for example
   `structure.json`, `structure.archify.html`, `structure.archify.delivery.json`.
   Run the official `visual-check` on the exact native bases.
3. Author `catalog.json`. Paths to specifications/bases/receipts are relative to
   the catalog directory and must stay within it. Source paths are relative to
   the separately supplied `--source-root`. Pin source files with SHA-256. For a
   mechanically checked signature, add `signatureSource` with an explicit line
   range whose trimmed text equals `signature` (line endings are normalized).
   Other signatures and all parameter/return/call semantics remain author-reviewed.
4. Generate into a dedicated output directory, not over the native bases:

   ```sh
   node scripts/build-interface-atlas.mjs /path/to/catalog.json --out /path/to/atlas --source-root /path/to/repository
   node scripts/build-interface-atlas.mjs /path/to/catalog.json --out /path/to/atlas --source-root /path/to/repository --check
   ```

   Omit `--source-root` only when the catalog has no source files; the receipt then
   reports no source-file checks. `context` is authored provenance, not an
   automatically verified Git revision. For a fixed-revision claim, first verify
   the referenced files against that revision, then pin those exact bytes.

All facts and signatures are inlined. Each derived diagram opens independently
without network access. Source links use encoded relative paths; moving the atlas
alone preserves interface reading but can break links back to repository files.
The builder never copies source files into the atlas. Do not put secrets or code
you cannot share into the catalog.

Regeneration preflights all inputs before writing. It refuses to overwrite a
nonempty unrelated directory, edited generated files, input aliases or symlinks.
Use a new output directory if changing the set of diagram IDs. `--check` is
read-only and detects stale inputs, assets, readers and receipts. Writes use
per-file temporary replacements with the receipt last; this is not a multi-file
filesystem transaction. If interrupted, regenerate into a new directory.

## Reading and exports

Click a mapped node, or use **Node interfaces / 节点接口** in the toolbar. Search
the current node or the diagram-local index. Enter/Space activates a focused
node, Esc closes the dialog, and focus returns to its opener. Shift-click retains
the original diagram interaction; unmapped nodes keep their original behavior.

Deep links use `#archify-api=NODE_ID&interface=INTERFACE_ID`. The reference page
links directly to those node-local details. Mapped `API N` tags remain visible in
READ; the extension never moves nodes or reroutes edges. Full parameter tables
belong to the HTML interaction, not canonical PNG/SVG exports. An interface-only
catalog does not silently become another execution-flow diagram.

## Verify the right artifact

There are separate evidence layers:

1. Native `deliver`: exact spec/base SHA-256 and 9/9 showcase checks, zero errors
   and warnings. The builder requires and verifies those receipts.
2. `interface-atlas.receipt.json`: catalog/assets/source bindings, exact derived
   outputs, node coverage and unchanged canonical SVG strings. This does not
   extend the native 9/9 claim to post-processed HTML.
3. Final browser evidence, using an already available Playwright and Chromium:

   ```sh
   ARCHIFY_CHROME=/path/to/chrome ARCHIFY_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
     node scripts/check-interface-atlas.mjs /path/to/atlas
   ```

   This checks every mapped node and signature, search, keyboard/close/focus,
   deep links, native interactions, desktop containment and mobile width. It
   captures settled light/dark endpoint screenshots and actual PNG/SVG exports.
   It waits for fonts and finite theme animations; a mid-transition screenshot
   is a capture defect, not evidence of the final palette. Missing browser tooling
   is `skipped`; runtime errors and incomplete capture are `failed`.
4. Perceptual review: actually inspect the final screenshots and representative
   details/exports. Record the reviewed artifact and screenshot hashes, scope,
   observations and correction rounds separately. Do not change the automated
   receipt's `visualReview: pending` or treat old screenshots as current.

Desktop diagram default views must fit the normal Archify desktop viewports.
Long interface references and open dialogs may scroll vertically; narrow layouts
also retain vertical scrolling. Never use clipping or smaller typography to
counterfeit containment. An atlas directory is a document, not another diagram:
do not expand its cards as filler to satisfy a diagram's vertical-rhythm rule.

Handoff the entry HTML, native receipts, derived receipt, final browser result
and truthful perceptual-review status. Keep historical receipts clearly marked
as historical. None of these layers proves firmware or application correctness.
