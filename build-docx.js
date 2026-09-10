#!/usr/bin/env node
/*
  build-docx.js
  Builds the Word version of the Moment Field Guide from guide.md, matching
  the V3 house styling (Arial, teal and amber, Letter, 0.75in margins).

  Usage:  node build-docx.js [guide.md] [output.docx]
          node build-docx.js sessions/2026-09-10.md   (front matter type: notes -> single flowing doc, no contents page)
  Defaults: guide.md in this folder, output Moment_Field_Guide_V<version>.docx

  The markdown parser is not duplicated here. It is read straight out of
  index.html (the <script id="core"> block), so the app and the docx always
  interpret guide.md the same way. Requires the docx npm package.
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, AlignmentType, BorderStyle, PageBreak, Bookmark, InternalHyperlink,
  LevelFormat, HeadingLevel, TableLayoutType, VerticalAlign
} = require('docx');

// ---------- inputs ----------
const here = __dirname;
const guidePath = process.argv[2] || path.join(here, 'guide.md');
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
const core = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const sandbox = {}; vm.createContext(sandbox); vm.runInContext(core + '\nthis.parseGuide=parseGuide;this.inline=inline;', sandbox);
const G = sandbox.parseGuide(fs.readFileSync(guidePath, 'utf8'));
const NOTES = G.meta.type === 'notes';
const outPath = process.argv[3] || path.join(here, NOTES ? `Session_Notes_${path.basename(guidePath, '.md')}.docx` : `Moment_Field_Guide_V${G.meta.version}.docx`);

// ---------- tokens (from the V3 document) ----------
const C = { teal: '0f4c5c', tealMid: '1b6b7d', ink: '1a1a1a', grey: '5b6770', amber: '8a5a11',
  amberWash: 'fbf3e4', tealWash: 'f2f6f7', rowAlt: 'f7fafb', line: 'd5dde0', box: '8fa3ab', white: 'ffffff' };
const FONT = 'Arial';
const WIDTH = 10080;            // content width in dxa (8.5in minus 2 x 0.75in)
const NIL = { style: BorderStyle.NIL, size: 0, color: '000000' };
const line = (color, size) => ({ style: BorderStyle.SINGLE, size, color });
const updatedLabel = u => '   UPDATED ' + u.toUpperCase();

// ---------- run helpers ----------
function run(text, o = {}) {
  return new TextRun({ text, font: FONT, size: o.size || 21, bold: !!o.bold, italics: !!o.italic, color: o.color || C.ink });
}
const dotRun = () => new TextRun({ text: '  ●', font: FONT, size: 12, bold: true, color: C.amber });

// Turn one markdown inline string into runs. Bold/italic markers and {new}.
function runs(text, o = {}) {
  let isNew = false;
  text = text.replace(/\s*\{new\}\s*/g, () => { isNew = true; return ' '; }).trim();
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(run(text.slice(last, m.index), o));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(run(tok.slice(2, -2), { ...o, bold: true }));
    else out.push(run(tok.slice(1, -1), { ...o, italic: true }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(run(text.slice(last), o));
  if (isNew) out.push(dotRun());
  return out;
}

// ---------- paragraph helpers ----------
const para = (children, o = {}) => new Paragraph({
  children, spacing: { before: o.before || 0, after: o.after == null ? 200 : o.after, line: o.line || 276, lineRule: 'auto' },
  keepNext: o.keepNext, pageBreakBefore: o.pageBreakBefore, border: o.border, heading: o.heading, numbering: o.numbering, indent: o.indent
});
function body(text, o = {}) {
  const stripped = text.replace(/\s*\{new\}\s*/g, '').trim();
  const lead = /^\*[^*]+\*$/.test(stripped);
  if (lead) { const kids = [run(stripped.slice(1, -1), { italic: true, color: C.grey })]; if (/\{new\}/.test(text)) kids.push(dotRun()); return para(kids, { after: o.after == null ? 240 : o.after, ...o }); }
  return para(runs(text), { after: 200, ...o });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 240, after: 100 }, children: runs(text, { bold: true, size: 22 }) });
}
function partHeading(p) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, pageBreakBefore: !NOTES, keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.teal, space: 6 } },
    spacing: { before: NOTES ? 360 : 0, after: 160 },
    children: [new Bookmark({ id: 'part' + p.num, children: [run(NOTES ? p.title : `Part ${p.num}.  ${p.title}`, { bold: true, size: 30, color: C.teal })] })]
  });
}
function sectionHeading(s) {
  const kids = [run(s.title, { bold: true, size: 25, color: C.tealMid })];
  if (s.updated) kids.push(run(updatedLabel(s.updated), { bold: true, size: 16, color: C.amber }));
  return new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 320, after: 120 }, children: [new Bookmark({ id: s.slug, children: kids })] });
}
let listInstance = 0;   // each numbered list restarts at 1
function listItems(items, kind) {
  const inst = ++listInstance;
  return items.map(t => new Paragraph({
    numbering: { reference: kind === 'ol' ? 'steps' : 'bullets', level: 0, instance: inst },
    spacing: { before: 0, after: 90, line: 276 }, children: runs(t)
  }));
}

// ---------- table helpers ----------
const margins = (top, left, bottom, right) => ({ top, left, bottom, right });
function cell(children, o = {}) {
  return new TableCell({
    children, width: { size: o.width, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    margins: o.margins || margins(120, 140, 120, 140), borders: o.borders, verticalAlign: o.valign
  });
}
function noteTable(b) {
  const warn = b.kind === 'warn';
  const accent = warn ? C.amber : C.teal;
  const kids = [para([run(b.title, { bold: true, color: accent })], { after: 80 })];
  const inner = b.blocks;
  inner.forEach((x, i) => {
    const lastBlock = i === inner.length - 1;
    if (x.type === 'p') kids.push(para(runs(x.text), { after: lastBlock ? 0 : 80 }));
    else if (x.type === 'ul' || x.type === 'ol') { const inst = ++listInstance; x.items.forEach((t, j) => kids.push(new Paragraph({
      numbering: { reference: x.type === 'ol' ? 'steps' : 'bullets', level: 0, instance: inst },
      spacing: { before: 0, after: lastBlock && j === x.items.length - 1 ? 0 : 60, line: 276 }, children: runs(t)
    }))); }
  });
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA }, columnWidths: [WIDTH], layout: TableLayoutType.FIXED,
    borders: { top: NIL, bottom: NIL, right: NIL, insideHorizontal: NIL, insideVertical: NIL, left: line(accent, 18) },
    rows: [new TableRow({ cantSplit: true, children: [cell(kids, { width: WIDTH, fill: warn ? C.amberWash : C.tealWash, margins: margins(160, 220, 160, 220) })] })]
  });
}
function spacer(after = 200) { return new Paragraph({ spacing: { before: 0, after, line: 240 }, children: [] }); }

function dataTable(b) {
  const cols = b.head.length;
  let widths;
  if (cols === 2) widths = [b.head[0] === '' ? 2400 : 2400, WIDTH - 2400];
  else if (cols === 3) { const first = 2000; widths = [first, Math.floor((WIDTH - first) / 2), WIDTH - first - Math.floor((WIDTH - first) / 2)]; }
  else { const w = Math.floor(WIDTH / cols); widths = Array(cols).fill(w); widths[cols - 1] = WIDTH - w * (cols - 1); }
  const head = new TableRow({ tableHeader: true, cantSplit: true, children: b.head.map((h, i) =>
    cell([para(runs(h, { bold: true, size: 20, color: C.white }), { after: 0, line: 260 })], { width: widths[i], fill: C.teal })) });
  const rows = b.rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) =>
    cell([para(runs(c, { bold: i === 0, size: 20 }), { after: 0, line: 260 })], { width: widths[i], fill: ri % 2 === 1 ? C.rowAlt : undefined })) }));
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    borders: { top: line(C.line, 4), bottom: line(C.line, 4), insideHorizontal: line(C.line, 4), insideVertical: line(C.line, 4), left: NIL, right: NIL },
    rows: [head, ...rows]
  });
}

function checkbox() {
  // The V3 checkbox: a 240 dxa single-cell table with a thin grey border.
  return new Table({
    width: { size: 240, type: WidthType.DXA }, columnWidths: [240], layout: TableLayoutType.FIXED,
    borders: { top: line(C.box, 6), bottom: line(C.box, 6), left: line(C.box, 6), right: line(C.box, 6), insideHorizontal: NIL, insideVertical: NIL },
    rows: [new TableRow({ children: [new TableCell({ width: { size: 240, type: WidthType.DXA }, margins: margins(0, 0, 0, 0),
      children: [new Paragraph({ spacing: { before: 0, after: 0, line: 200, lineRule: 'auto' }, children: [new TextRun({ text: ' ', font: FONT, size: 16 })] })] })] })]
  });
}
function checklistTable(b) {
  const noBorders = { top: NIL, bottom: NIL, left: NIL, right: NIL };
  const rows = b.items.map(item => {
    let isNew = false;
    const clean = item.replace(/\s*\{new\}\s*/g, () => { isNew = true; return ' '; }).trim();
    const m = clean.match(/^\*\*(.+?)\*\*\s*(.*)$/s);
    const title = m ? m[1] : clean; let note = m ? m[2].trim() : '';
    note = note.replace(/^\*|\*$/g, '');
    const titleRuns = [run(title, { bold: true })]; if (isNew) titleRuns.push(dotRun());
    const textKids = [para(titleRuns, { after: note ? 40 : 0 })];
    if (note) textKids.push(para([run(note, { italic: true, color: C.grey, size: 19 })], { after: 0 }));
    return new TableRow({ cantSplit: true, children: [
      cell([checkbox(), new Paragraph({ spacing: { before: 0, after: 0, line: 200, lineRule: 'auto' }, children: [] })], { width: 460, borders: noBorders, margins: margins(120, 40, 120, 40) }),
      cell(textKids, { width: WIDTH - 460, borders: noBorders, margins: margins(120, 160, 120, 80) })
    ] });
  });
  return new Table({
    width: { size: WIDTH, type: WidthType.DXA }, columnWidths: [460, WIDTH - 460], layout: TableLayoutType.FIXED,
    borders: { top: line(C.line, 4), bottom: line(C.line, 4), insideHorizontal: line(C.line, 4), insideVertical: NIL, left: NIL, right: NIL },
    rows
  });
}

// ---------- block dispatcher ----------
function renderBlocks(blocks) {
  const out = [];
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    if (b.type === 'p') out.push(body(b.text));
    else if (b.type === 'h3') out.push(h3(b.text));
    else if (b.type === 'ul' || b.type === 'ol') { out.push(...listItems(b.items, b.type)); out.push(spacer(110)); }
    else if (b.type === 'table') { out.push(dataTable(b)); out.push(spacer(next && next.type === 'note' ? 120 : 200)); }
    else if (b.type === 'note') { out.push(noteTable(b)); out.push(spacer(next && next.type === 'note' ? 120 : 200)); }
    else if (b.type === 'check') { out.push(checklistTable(b)); out.push(spacer(240)); }
  });
  return out;
}

// ---------- document assembly ----------
const m = G.meta;
const children = [];
// title block
children.push(para([run(m.kicker.toUpperCase(), { bold: true, size: 20, color: C.tealMid })], { before: 240, after: 60 }));
children.push(para([run(m.title, { bold: true, size: 52 })], { after: 60 }));
children.push(para([run(NOTES ? `Goes with Version ${m.version} of the guide` : `Version ${m.version}, updated ${m.updated}`, { bold: true, size: 26, color: C.teal })], { after: 120 }));
children.push(para([run(`For ${m.for}. ${m.compiled}`, { size: 20, color: C.grey })],
  { after: 200, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.teal, space: 8 } } }));
// front matter: the how-to note, then the New in Version table
const front = G.parts[0];
children.push(...renderBlocks(front.intro));
for (const s of front.sections) {
  children.push(para([run(s.title, { bold: true, size: 24, color: C.teal })], { before: 120, after: 120, keepNext: true }));
  children.push(...renderBlocks(s.blocks));
}
// contents page (skipped for session notes)
if (!NOTES) {
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(para([run('CONTENTS', { bold: true, size: 22, color: C.teal })], { after: 140, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.line, space: 4 } } }));
for (const p of G.parts) {
  if (p.num === 0) continue;
  children.push(new Paragraph({ spacing: { before: 160, after: 24, line: 252 }, children: [new InternalHyperlink({ anchor: 'part' + p.num,
    children: [run(`Part ${p.num}.  ${p.title}`, { bold: true, size: 22, color: C.teal })] })] }));
  for (const s of p.sections) children.push(new Paragraph({ spacing: { before: 0, after: 24, line: 252 }, indent: { left: 360 },
    children: [new InternalHyperlink({ anchor: s.slug, children: [new TextRun({ text: s.title, font: FONT, size: 21, color: C.tealMid, underline: {} })] })] }));
}
}
// parts
for (const p of G.parts) {
  if (p.num === 0) continue;
  children.push(partHeading(p));
  children.push(...renderBlocks(p.intro));
  for (const s of p.sections) { children.push(sectionHeading(s)); children.push(...renderBlocks(s.blocks)); }
}

const doc = new Document({
  creator: 'build-docx.js', title: m.title,
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: C.ink } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: C.teal } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 25, bold: true, color: C.tealMid } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true, color: C.ink } }
    ]
  },
  numbering: { config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 200 } } } }] },
    { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 440, hanging: 300 } } } }] }
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080, header: 708, footer: 708 } } },
    children
  }]
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outPath, buf); console.log('Wrote', outPath); });
