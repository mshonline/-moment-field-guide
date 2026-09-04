# Updating the guide after a session

The loop is: upload three files and a transcript, paste one prompt, commit two files, share one docx. About ten minutes of your time once the session's summary is settled.

## 1. Gather

From the repo (download the current versions, or copy from your local clone):

- `guide.md`
- `CHANGELOG.md`
- `index.html` (only needed if you want the docx built in the session; it holds the parser the generator uses)
- `build-docx.js`

From the session:

- The Zoom transcript (.vtt or .txt)
- Any notes Marnie sent from the app's Notes view, pasted into the chat

## 2. Paste this prompt

Change the date and version on the first line. Everything else stays the same.

```
This is an update to the Moment Field Guide after the [DATE] session. Bump it to Version [N].

Attached: guide.md (the master), CHANGELOG.md, build-docx.js, index.html, and the session transcript.

Read the transcript and update guide.md. Rules:

1. guide.md is the only source. Edit it in place and return the complete file. Keep every existing convention exactly: front matter keys, part and section headings, {updated: DD Mon} tags, {new} markers, - [ ] checklist items with bold title and italic note, ::: note and ::: warn callouts, tables with the label in the first column.
2. Version housekeeping first. Set version and updated in the front matter. Remove every existing {updated: ...} tag and every {new} marker from the previous version, then add fresh ones only where this session changed something. Replace the "New in Version" section with "New in Version [N]" and a new table, one row per change, in the same two-column format. The old rows go to CHANGELOG.md.
3. Only write what the transcript supports. If something was discussed but not settled, put it under Open questions and next sessions, not in the body. Do not invent settings, values, or steps.
4. Keep the voice: warm, plain, second person, short sentences. No em dashes or en dashes anywhere. Explain the reason behind a change in one line when the transcript gives one, because Marnie reads the why.
5. When a value changes (an ISO, a setting, a drive name, a step), change it everywhere it appears, including the quick: block in the front matter and the checklists in Part 1. Search the file for the old value before you finish.
6. If Marnie used a word for something the guide calls by another name, add it to the synonyms: block.
7. Anything that was resolved from the Open questions list moves out of that list and into the body with a {new} marker.
8. Update CHANGELOG.md: add a "## Version [N], [date]" entry at the top with the same table, and keep the older entries.
9. Then build the docx: run build-docx.js against the new guide.md (it reads the parser from index.html) and give me the .docx.
10. Finish with a short change summary in the chat: what changed, what you were unsure about, and anything in the transcript you deliberately left out and why.

Return guide.md, CHANGELOG.md, and the docx as files.
```

## 3. Review before committing

Read the change summary first, then open the new `guide.md` and check:

- The version and date at the top.
- The "New in Version N" table reads right and nothing is invented.
- Search for `{updated:` and `{new}`: every one should be from this session.
- Any value that changed is changed everywhere (checklist, profile table, quick reference).
- Nothing important from the transcript is missing. If it is, ask for it in the same chat; the file is still loaded.

If something is wrong, say so in the chat and ask for the corrected file. Do not hand-edit the docx; fix the markdown and rebuild.

## 4. Commit

1. In the repo, `versions/`: upload the outgoing `guide.md` renamed to `guide-v<old>.md` and the outgoing docx. This is the only step that is easy to forget and impossible to do later.
2. Upload the new `guide.md` and `CHANGELOG.md` to the repo root (Add file, Upload files, commit; GitHub overwrites the old ones).
3. Wait a minute. Open the app on your phone, pull down to reload or use Check for updates in Settings, and confirm the version at the top and the What's New dot.

`index.html`, `sw.js`, `manifest.json`, and `icons/` do not change in a content update. If a session changes the app itself, bump `CACHE` in `sw.js`.

## 5. Share

Drop the new docx into Marnie's Google Drive folder. Tell her the version number; the app shows the What's New dot on its own.

## Building the docx yourself

If you'd rather build locally than in the session:

```
cd moment-field-guide
npm install
node build-docx.js
```

That writes `Moment_Field_Guide_V<N>.docx` next to `guide.md`. The generator reads the version from the front matter, so the filename follows the guide.

## If a session adds a kind of content the conventions don't cover

Say so in the chat and ask for the smallest extension that keeps the parser in `index.html` and `build-docx.js` in agreement. Both have to change together, and the README's conventions list should be updated at the same time. Anything that only one of them understands will look right in one output and silently vanish from the other.
