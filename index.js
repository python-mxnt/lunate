const storageKey = "lunote.notes";
const newNoteBtn = document.getElementById("new-note-btn");
const removeNoteBtn = document.getElementById("remove-note-btn");
const notesList = document.getElementById("notes-list");
const notesCount = document.getElementById("notes-count");
const noteTitleInput = document.getElementById("note-title");
const noteContentInput = document.getElementById("note-content");

let notes = loadNotes();
let selectedId = notes[0]?.id ?? null;

function normalizeTitle(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeContent(text) {
  return text.toLowerCase();
}

function makePreview(content) {
  const compact = content.replace(/\s+/g, " ").trim();
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

  if (!hasSelection) {
    noteTitleInput.value = "";
    noteContentInput.value = "";
    noteTitleInput.placeholder = "no note selected";
    noteContentInput.placeholder = "create a note from the left sidebar";
    return;
  }

  noteTitleInput.placeholder = "untitled";
  noteContentInput.placeholder = "write your note here...";
  noteTitleInput.value = note.title;
  noteContentInput.value = note.content;
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
}

newNoteBtn.addEventListener("click", createNote);
removeNoteBtn.addEventListener("click", deleteSelectedNote);

notesList.addEventListener("click", (event) => {
  const button = event.target.closest(".note-item");
  if (!button) {
    return;
  }
  selectedId = button.dataset.id;
  render();
});

noteTitleInput.addEventListener("input", (event) => {
  const normalized = normalizeTitle(event.target.value);
  if (event.target.value !== normalized) {
    event.target.value = normalized;
  }
  updateSelectedField("title", event.target.value);
});

noteContentInput.addEventListener("input", (event) => {
  const normalized = normalizeContent(event.target.value);
  if (event.target.value !== normalized) {
    event.target.value = normalized;
  }
  updateSelectedField("content", event.target.value);
});

noteTitleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    noteContentInput.focus();
  }
});

render();
