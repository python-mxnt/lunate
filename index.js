const storageKey = "lunote.notes";
const newNoteBtn = document.getElementById("new-note-btn");
const removeNoteBtn = document.getElementById("remove-note-btn");
const downloadNoteBtn = document.getElementById("download-note-btn");
const notesList = document.getElementById("notes-list");
const notesCount = document.getElementById("notes-count");
const noteTitleInput = document.getElementById("note-title");
const noteContentInput = document.getElementById("note-content");
const markdownToolbar = document.getElementById("markdown-toolbar");
const markdownPreview = document.getElementById("markdown-preview");
const toolbarButtons = Array.from(markdownToolbar.querySelectorAll("button"));

let notes = loadNotes();
let selectedId = notes[0]?.id ?? null;

function normalizeTitle(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeContent(text) {
  return text.toLowerCase();
}

function makePreview(content) {
  const compact = content
    .replace(/[#>*`[\]()_-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) {
    return "empty note";
  }
  return compact.length > 80 ? `${compact.slice(0, 80)}...` : compact;
}

function noteLabel(note) {
  return note.title || "untitled";
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => {
        if (!item || typeof item.id !== "string") {
          return null;
        }

        if (typeof item.title === "string" && typeof item.content === "string") {
          return {
            id: item.id,
            title: normalizeTitle(item.title),
            content: normalizeContent(item.content),
            updatedAt:
              typeof item.updatedAt === "number"
                ? item.updatedAt
                : Date.now() - index,
          };
        }

        if (typeof item.text === "string") {
          const legacy = normalizeContent(item.text);
          return {
            id: item.id,
            title: normalizeTitle(legacy.split("\n")[0] || ""),
            content: legacy,
            updatedAt: Date.now() - index,
          };
        }

        return null;
      })
      .filter((item) => item !== null);
  } catch (error) {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(storageKey, JSON.stringify(notes));
}

function selectedNote() {
  return notes.find((note) => note.id === selectedId) ?? null;
}

function formatCount() {
  const total = notes.length;
  notesCount.textContent = `${total} ${total === 1 ? "note" : "notes"}`;
}

function renderList() {
  notesList.innerHTML = "";
  formatCount();

  if (!notes.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "no notes yet. create one to get started.";
    notesList.appendChild(empty);
    return;
  }

  for (const note of notes) {
    const item = document.createElement("li");
    const trigger = document.createElement("button");
    const title = document.createElement("span");
    const preview = document.createElement("span");

    trigger.type = "button";
    trigger.className = "note-item";
    trigger.dataset.id = note.id;
    if (note.id === selectedId) {
      trigger.classList.add("is-active");
    }

    title.className = "note-item-title";
    title.textContent = noteLabel(note);
    preview.className = "note-item-preview";
    preview.textContent = makePreview(note.content);

    trigger.append(title, preview);
    item.appendChild(trigger);
    notesList.appendChild(item);
  }
}

function renderEditor() {
  const note = selectedNote();
  const hasSelection = Boolean(note);

  noteTitleInput.disabled = !hasSelection;
  noteContentInput.disabled = !hasSelection;
  removeNoteBtn.disabled = !hasSelection;
  downloadNoteBtn.disabled = !hasSelection;
  for (const button of toolbarButtons) {
    button.disabled = !hasSelection;
  }

  if (!hasSelection) {
    noteTitleInput.value = "";
    noteContentInput.value = "";
    noteTitleInput.placeholder = "no note selected";
    noteContentInput.placeholder = "create a note from the left sidebar";
    markdownPreview.innerHTML =
      '<p class="md-empty">create a note to see markdown preview.</p>';
    return;
  }

  noteTitleInput.placeholder = "untitled";
  noteContentInput.placeholder = "write your note here...";
  noteTitleInput.value = note.title;
  noteContentInput.value = note.content;
  renderPreview(note.content);
}

function render() {
  renderList();
  renderEditor();
}

function createNote() {
  const note = {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    updatedAt: Date.now(),
  };

  notes.unshift(note);
  selectedId = note.id;
  saveNotes();
  render();
  noteTitleInput.focus();
}

function deleteSelectedNote() {
  if (!selectedId) {
    return;
  }

  const currentIndex = notes.findIndex((note) => note.id === selectedId);
  if (currentIndex === -1) {
    return;
  }

  notes.splice(currentIndex, 1);

  if (!notes.length) {
    selectedId = null;
  } else if (currentIndex < notes.length) {
    selectedId = notes[currentIndex].id;
  } else {
    selectedId = notes[notes.length - 1].id;
  }

  saveNotes();
  render();
}

function updateSelectedField(field, rawValue) {
  const note = selectedNote();
  if (!note) {
    return;
  }

  const nextValue =
    field === "title" ? normalizeTitle(rawValue) : normalizeContent(rawValue);

  note[field] = nextValue;
  note.updatedAt = Date.now();
  saveNotes();
  renderList();
  if (field === "content") {
    renderPreview(note.content);
  }
}

function toFileName(text) {
  const base = normalizeTitle(text)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "untitled-note";
}

function buildMarkdownForDownload(note) {
  const parts = [];
  if (note.title) {
    parts.push(`# ${note.title}`);
  }
  if (note.content) {
    if (parts.length) {
      parts.push("");
    }
    parts.push(note.content);
  }
  return parts.join("\n");
}

function downloadSelectedNote() {
  const note = selectedNote();
  if (!note) {
    return;
  }

  const markdownText = buildMarkdownForDownload(note);
  const blob = new Blob([markdownText], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${toFileName(note.title)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseInline(text) {
  const escaped = escapeHtml(text);
  const codeTokens = [];

  let output = escaped.replace(/`([^`]+)`/g, (_, codeText) => {
    const token = `__code_${codeTokens.length}__`;
    codeTokens.push(`<code>${codeText}</code>`);
    return token;
  });

  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  output = output.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return output.replace(/__code_(\d+)__/g, (_, index) => codeTokens[index] || "");
}

function renderMarkdown(markdown) {
  if (!markdown.trim()) {
    return '<p class="md-empty">nothing to preview yet.</p>';
  }

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let inCodeBlock = false;
  let codeBlockLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    const content = paragraph.map((line) => parseInline(line)).join("<br>");
    html.push(`<p>${content}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null;
      listItems = [];
      return;
    }

    if (listType === "task") {
      const taskRows = listItems
        .map(
          (item) =>
            `<li><input type="checkbox" disabled ${item.checked ? "checked" : ""} /> ${parseInline(item.text)}</li>`
        )
        .join("");
      html.push(`<ul class="md-task-list">${taskRows}</ul>`);
    } else {
      const items = listItems
        .map((item) => `<li>${parseInline(item)}</li>`)
        .join("");
      html.push(`<${listType}>${items}</${listType}>`);
    }

    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    if (inCodeBlock) {
      if (/^```/.test(line.trim())) {
        html.push(
          `<pre><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`
        );
        inCodeBlock = false;
        codeBlockLines = [];
      } else {
        codeBlockLines.push(line);
      }
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushParagraph();
      flushList();
      inCodeBlock = true;
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${parseInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^([-*]){3,}$/.test(line.trim())) {
      flushParagraph();
      flushList();
      html.push("<hr>");
      continue;
    }

    const taskMatch = line.match(/^- \[( |x)\]\s+(.*)$/);
    if (taskMatch) {
      flushParagraph();
      if (listType !== "task") {
        flushList();
        listType = "task";
      }
      listItems.push({ checked: taskMatch[1] === "x", text: taskMatch[2] });
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(olMatch[1]);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${parseInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

function renderPreview(content) {
  markdownPreview.innerHTML = renderMarkdown(content);
}

function replaceSelection(before, after = before, fallbackText = "text") {
  if (noteContentInput.disabled) {
    return;
  }

  const source = noteContentInput.value;
  const start = noteContentInput.selectionStart;
  const end = noteContentInput.selectionEnd;
  const selected = source.slice(start, end) || fallbackText;
  const replacement = `${before}${selected}${after}`;

  noteContentInput.value = source.slice(0, start) + replacement + source.slice(end);
  noteContentInput.focus();
  noteContentInput.setSelectionRange(
    start + before.length,
    start + before.length + selected.length
  );
  noteContentInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function replaceSelectedLines(transformLine) {
  if (noteContentInput.disabled) {
    return;
  }

  const source = noteContentInput.value;
  const start = noteContentInput.selectionStart;
  const end = noteContentInput.selectionEnd;

  const blockStart = source.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = source.indexOf("\n", end);
  const blockEnd = nextBreak === -1 ? source.length : nextBreak;

  const target = source.slice(blockStart, blockEnd);
  const lines = target.split("\n");
  const transformed = lines.map((line, index) => transformLine(line, index)).join("\n");

  noteContentInput.value =
    source.slice(0, blockStart) + transformed + source.slice(blockEnd);
  noteContentInput.focus();
  noteContentInput.setSelectionRange(blockStart, blockStart + transformed.length);
  noteContentInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function insertTextAtCursor(text) {
  if (noteContentInput.disabled) {
    return;
  }
  const source = noteContentInput.value;
  const start = noteContentInput.selectionStart;
  const end = noteContentInput.selectionEnd;
  noteContentInput.value = source.slice(0, start) + text + source.slice(end);
  const cursor = start + text.length;
  noteContentInput.focus();
  noteContentInput.setSelectionRange(cursor, cursor);
  noteContentInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function runToolbarAction(action) {
  switch (action) {
    case "heading":
      replaceSelectedLines((line) => `# ${line.replace(/^#+\s*/, "")}`);
      break;
    case "bold":
      replaceSelection("**", "**", "bold text");
      break;
    case "italic":
      replaceSelection("*", "*", "italic text");
      break;
    case "quote":
      replaceSelectedLines((line) => `> ${line.replace(/^>\s?/, "")}`);
      break;
    case "ul":
      replaceSelectedLines((line) => `- ${line.replace(/^[-*]\s+/, "")}`);
      break;
    case "ol":
      replaceSelectedLines((line, index) => {
        const cleaned = line.replace(/^\d+\.\s+/, "");
        return `${index + 1}. ${cleaned}`;
      });
      break;
    case "task":
      replaceSelectedLines((line) => {
        const cleaned = line.replace(/^- \[[ x]\]\s+/, "");
        return `- [ ] ${cleaned}`;
      });
      break;
    case "code": {
      const selection = noteContentInput.value.slice(
        noteContentInput.selectionStart,
        noteContentInput.selectionEnd
      );
      if (selection.includes("\n")) {
        replaceSelection("```\n", "\n```", "code block");
      } else {
        replaceSelection("`", "`", "code");
      }
      break;
    }
    case "link":
      replaceSelection("[", "](https://example.com)", "link text");
      break;
    case "divider":
      insertTextAtCursor("\n---\n");
      break;
    default:
      break;
  }
}

newNoteBtn.addEventListener("click", createNote);
removeNoteBtn.addEventListener("click", deleteSelectedNote);
downloadNoteBtn.addEventListener("click", downloadSelectedNote);

notesList.addEventListener("click", (event) => {
  const button = event.target.closest(".note-item");
  if (!button) {
    return;
  }
  selectedId = button.dataset.id;
  render();
});

noteTitleInput.addEventListener("input", (event) => {
  const input = event.target;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const normalized = normalizeTitle(input.value);
  if (input.value !== normalized) {
    input.value = normalized;
    input.setSelectionRange(start, end);
  }
  updateSelectedField("title", input.value);
});

noteContentInput.addEventListener("input", (event) => {
  const input = event.target;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const normalized = normalizeContent(input.value);
  if (input.value !== normalized) {
    input.value = normalized;
    input.setSelectionRange(start, end);
  }
  updateSelectedField("content", input.value);
});

noteTitleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    noteContentInput.focus();
  }
});

markdownToolbar.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }
  runToolbarAction(trigger.dataset.action);
});

noteContentInput.addEventListener("keydown", (event) => {
  if (!(event.metaKey || event.ctrlKey)) {
    return;
  }

  if (event.key.toLowerCase() === "b") {
    event.preventDefault();
    runToolbarAction("bold");
  } else if (event.key.toLowerCase() === "i") {
    event.preventDefault();
    runToolbarAction("italic");
  } else if (event.key.toLowerCase() === "k") {
    event.preventDefault();
    runToolbarAction("link");
  }
});

render();
