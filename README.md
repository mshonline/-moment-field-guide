# Moment Field Guide, web app

A phone-first, offline-capable reference built from a single markdown file. `guide.md` is the master. The app renders it directly, and the Word document is generated from it.

## Files

| File | What it is |
| --- | --- |
| `guide.md` | The master content. Edit this, nothing else, to change the guide. |
| `CHANGELOG.md` | One entry per version. The app's What's New view reads it. |
| `index.html` | The whole app. No build step, no dependencies. Also holds the markdown parser that `build-docx.js` reuses. |
| `build-docx.js`, `package.json` | Generates the Word document from `guide.md` in the V3 house style. `npm install` once, then `node build-docx.js`. |
| `UPDATE.md` | The runbook for updating after a session, including the prompt to paste. |
| `manifest.json`, `sw.js`, `icons/` | Home-screen install and offline support. |
| `versions/` | Prior versions of `guide.md` and the generated docx, kept for reference. |

## Put it on GitHub Pages

1. Create a new repository on GitHub (public, or private if your plan supports Pages from private repos). Name it something like `moment-field-guide`.
2. Upload every file in this folder to the root of the repo, keeping the `icons/` folder.
3. In the repo, open Settings, then Pages. Under Build and deployment, set Source to "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/moment-field-guide/`.
5. On the iPhone, open that link in Safari, tap Share, then Add to Home Screen. It opens full screen and keeps working with no signal.

Note: GitHub Pages sites are public even when the repo is private. The URL is not discoverable, but anyone with the link can read it.

## Optional: notes by email

Open `index.html`, find `CONFIG` near the top of the script, and put your email in `notesEmail`. The Notes view then gets an Email button that opens Mail with all saved notes in the body.

## Markdown conventions in guide.md

These are what the app and the docx generator understand. Keep to them and both outputs stay in sync.

```
---                          front matter: title, version, updated, quick reference, synonyms
# Part 1. Before you shoot   a part
## Section title {updated: 28 Aug}   a section, with an optional update tag
### Subsection
*Italic line*                a lead-in or aside
- [ ] **Item title** *Note*   a checklist item: bold title, italic note
- bullet                     a plain bullet
1. step                      a numbered step (4 or more get a walkthrough button)
| a | b |                    a table; first column is treated as the label
::: note Title               a callout box (teal)
::: warn Title               a callout box in amber, for cautions and open questions
text
:::
{new}                        anywhere on a line: an amber dot marking a new line
```

The `quick:` list in the front matter is the Quick reference card. Each line is `Label | Value`. Update the values here when they change in the body of the guide.

The `synonyms:` list teaches search. Each line is `term | alias, alias, alias`. Add a line whenever Marnie uses a word for something that the guide calls something else.

## Updating after a session

See `UPDATE.md`. In short: upload `guide.md`, `CHANGELOG.md`, `build-docx.js`, `index.html`, and the transcript to a Claude session, paste the prompt from the runbook, review, commit `guide.md` and `CHANGELOG.md`, share the docx.

`index.html` only changes when the app itself changes. If it does, bump `CACHE` in `sw.js` so phones pick up the new version.

## Running it locally

Any static server works. From this folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` directly from disk does not work because the app fetches `guide.md`.
