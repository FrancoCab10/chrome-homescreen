const STORAGE_KEY = "homescreen-data-v2";
const defaults = {
  sections: [
    { id: crypto.randomUUID(), name: "Work", size: "large" },
    { id: crypto.randomUUID(), name: "Daily", size: "medium" },
    { id: crypto.randomUUID(), name: "Leisure", size: "small" }
  ],
  apps: [],
  settings: {
    bgType: "gradient",
    bgValue: "radial-gradient(circle at 15% 10%, #32354f 0%, #161826 45%, #090a11 100%)",
    panelColor: "#141826",
    accentColor: "#7f8cff",
    textColor: "#eef1ff"
  }
};

defaults.apps = [
  { id: crypto.randomUUID(), sectionId: defaults.sections[0].id, name: "Gmail", url: "https://mail.google.com", icon: "" },
  { id: crypto.randomUUID(), sectionId: defaults.sections[0].id, name: "GitHub", url: "https://github.com", icon: "" },
  { id: crypto.randomUUID(), sectionId: defaults.sections[1].id, name: "Calendar", url: "https://calendar.google.com", icon: "" },
  { id: crypto.randomUUID(), sectionId: defaults.sections[2].id, name: "YouTube", url: "https://youtube.com", icon: "" }
];

let state = structuredClone(defaults);
let draggedSectionId = null;

const el = {
  launcherForm: document.querySelector("#launcher-form"),
  launcherInput: document.querySelector("#launcher-input"),
  suggestions: document.querySelector("#suggestions"),
  sectionsGrid: document.querySelector("#sections-grid"),
  addAppForm: document.querySelector("#add-app-form"),
  toggleAddApp: document.querySelector("#toggle-add-app"),
  cancelAddApp: document.querySelector("#cancel-add-app"),
  appName: document.querySelector("#app-name"),
  appUrl: document.querySelector("#app-url"),
  appSection: document.querySelector("#app-section"),
  appIcon: document.querySelector("#app-icon"),
  appTemplate: document.querySelector("#app-card-template"),
  sectionTemplate: document.querySelector("#section-template"),
  settingsDialog: document.querySelector("#settings-dialog"),
  openSettings: document.querySelector("#open-settings"),
  bgType: document.querySelector("#bg-type"),
  bgValue: document.querySelector("#bg-value"),
  panelColor: document.querySelector("#panel-color"),
  accentColor: document.querySelector("#accent-color"),
  textColor: document.querySelector("#text-color"),
  saveSettings: document.querySelector("#save-settings"),
  resetSettings: document.querySelector("#reset-settings")
};

init().catch(console.error);

async function init() {
  await loadState();
  bindEvents();
  renderAll();
}

function getStorageApi() {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local;
  return null;
}

async function loadState() {
  const storageApi = getStorageApi();

  if (!storageApi) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = normalizeState(JSON.parse(raw));
    return;
  }

  const result = await storageApi.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    state = normalizeState(result[STORAGE_KEY]);
  }
}

function normalizeState(data) {
  const merged = {
    sections: Array.isArray(data.sections) ? data.sections : structuredClone(defaults.sections),
    apps: Array.isArray(data.apps) ? data.apps : structuredClone(defaults.apps),
    settings: {
      ...defaults.settings,
      ...(data.settings ?? {})
    }
  };

  if (!merged.sections.length) merged.sections = structuredClone(defaults.sections);

  const sectionByName = new Map(merged.sections.map((section) => [section.name.toLowerCase(), section.id]));
  merged.apps = merged.apps.map((app) => {
    if (app.sectionId) return app;
    const mappedId = sectionByName.get((app.section || "").toLowerCase()) || merged.sections[0].id;
    return { ...app, sectionId: mappedId };
  });

  merged.sections = merged.sections.map((section) => ({
    id: section.id || crypto.randomUUID(),
    name: section.name || "General",
    size: ["small", "medium", "large"].includes(section.size) ? section.size : "medium"
  }));

  merged.apps = merged.apps.map((app) => ({
    id: app.id || crypto.randomUUID(),
    sectionId: app.sectionId || merged.sections[0].id,
    name: app.name || "Untitled",
    url: app.url || "https://google.com",
    icon: app.icon || ""
  }));

  return merged;
}

async function persist() {
  const storageApi = getStorageApi();
  if (!storageApi) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }

  await storageApi.set({ [STORAGE_KEY]: state });
}

function bindEvents() {
  el.launcherForm.addEventListener("submit", onLaunchSubmit);
  el.launcherInput.addEventListener("input", renderSuggestions);

  el.toggleAddApp.addEventListener("click", () => {
    el.addAppForm.classList.toggle("hidden");
    if (!el.addAppForm.classList.contains("hidden")) el.appName.focus();
  });

  el.cancelAddApp.addEventListener("click", () => {
    el.addAppForm.classList.add("hidden");
    el.addAppForm.reset();
  });

  el.addAppForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const url = ensureUrl(el.appUrl.value.trim());
    if (!url) return;

    const sectionId = getOrCreateSection(el.appSection.value.trim() || "General");
    state.apps.push({
      id: crypto.randomUUID(),
      sectionId,
      name: el.appName.value.trim(),
      url,
      icon: el.appIcon.value.trim()
    });

    await persist();
    el.addAppForm.reset();
    el.addAppForm.classList.add("hidden");
    renderAll();
  });

  el.openSettings.addEventListener("click", () => {
    syncSettingsFields();
    el.settingsDialog.showModal();
  });

  el.saveSettings.addEventListener("click", async () => {
    state.settings = {
      bgType: el.bgType.value,
      bgValue: el.bgValue.value.trim(),
      panelColor: el.panelColor.value,
      accentColor: el.accentColor.value,
      textColor: el.textColor.value
    };

    await persist();
    applySettings();
    el.settingsDialog.close();
  });

  el.resetSettings.addEventListener("click", async () => {
    state.settings = structuredClone(defaults.settings);
    await persist();
    syncSettingsFields();
    applySettings();
  });
}

function getOrCreateSection(name) {
  const normalized = name.trim();
  const existing = state.sections.find((section) => section.name.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing.id;

  const newSection = { id: crypto.randomUUID(), name: normalized, size: "medium" };
  state.sections.push(newSection);
  return newSection.id;
}

function renderAll() {
  applySettings();
  renderSections();
  renderSuggestions();
}

function applySettings() {
  const { bgType, bgValue, panelColor, accentColor, textColor } = state.settings;
  document.documentElement.style.setProperty("--accent", accentColor);
  document.documentElement.style.setProperty("--text", textColor);
  document.documentElement.style.setProperty("--muted", hexToRgba(textColor, 0.72));
  document.documentElement.style.setProperty("--panel", hexToRgba(panelColor, 0.72));

  if (bgType === "image") {
    document.documentElement.style.setProperty("--bg", `url('${bgValue}') center / cover no-repeat fixed`);
  } else {
    document.documentElement.style.setProperty("--bg", bgValue || defaults.settings.bgValue);
  }
}

function syncSettingsFields() {
  el.bgType.value = state.settings.bgType;
  el.bgValue.value = state.settings.bgValue;
  el.panelColor.value = state.settings.panelColor;
  el.accentColor.value = state.settings.accentColor;
  el.textColor.value = state.settings.textColor;
}

function renderSections() {
  el.sectionsGrid.innerHTML = "";

  state.sections.forEach((section) => {
    const node = el.sectionTemplate.content.firstElementChild.cloneNode(true);
    const title = node.querySelector(".section-title");
    const appsRow = node.querySelector(".apps-row");
    node.dataset.sectionId = section.id;
    node.classList.add(`section--${section.size}`);
    title.textContent = section.name;

    const apps = state.apps.filter((app) => app.sectionId === section.id);
    apps.forEach((app) => {
      const card = el.appTemplate.content.firstElementChild.cloneNode(true);
      const openBtn = card.querySelector(".app-open");
      const deleteBtn = card.querySelector(".app-delete");
      const icon = card.querySelector(".app-icon");
      const name = card.querySelector(".app-name");

      icon.src = app.icon || faviconForUrl(app.url);
      icon.alt = `${app.name} icon`;
      name.textContent = app.name;

      openBtn.addEventListener("click", () => openUrl(app.url));
      deleteBtn.addEventListener("click", async () => {
        state.apps = state.apps.filter((entry) => entry.id !== app.id);
        await persist();
        renderAll();
      });

      appsRow.append(card);
    });

    wireSectionDrag(node, section.id);
    el.sectionsGrid.append(node);
  });
}

function wireSectionDrag(node, sectionId) {
  node.addEventListener("dragstart", (event) => {
    draggedSectionId = sectionId;
    event.dataTransfer.effectAllowed = "move";
    node.classList.add("dragging");
  });

  node.addEventListener("dragend", () => {
    node.classList.remove("dragging");
    node.classList.remove("drag-over");
    draggedSectionId = null;
    clearDragOverStates();
  });

  node.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (draggedSectionId === sectionId) return;
    node.classList.add("drag-over");
  });

  node.addEventListener("dragleave", () => {
    node.classList.remove("drag-over");
  });

  node.addEventListener("drop", async (event) => {
    event.preventDefault();
    node.classList.remove("drag-over");
    if (!draggedSectionId || draggedSectionId === sectionId) return;
    reorderSections(draggedSectionId, sectionId);
    await persist();
    renderSections();
  });
}

function clearDragOverStates() {
  document.querySelectorAll(".section.drag-over").forEach((section) => section.classList.remove("drag-over"));
}

function reorderSections(fromId, toId) {
  const fromIndex = state.sections.findIndex((section) => section.id === fromId);
  const toIndex = state.sections.findIndex((section) => section.id === toId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = state.sections.splice(fromIndex, 1);
  state.sections.splice(toIndex, 0, moved);
}

function renderSuggestions() {
  const query = el.launcherInput.value.trim().toLowerCase();
  if (!query) {
    el.suggestions.innerHTML = "";
    el.suggestions.classList.add("hidden");
    return;
  }

  const sectionNameById = new Map(state.sections.map((section) => [section.id, section.name]));
  const apps = state.apps.filter((app) => {
    const sectionName = sectionNameById.get(app.sectionId) || "General";
    return app.name.toLowerCase().includes(query) || sectionName.toLowerCase().includes(query);
  });

  el.suggestions.innerHTML = "";

  apps.slice(0, 6).forEach((app) => {
    const li = document.createElement("li");
    const sectionName = sectionNameById.get(app.sectionId) || "General";
    li.className = "suggestion-item";
    li.tabIndex = 0;
    li.innerHTML = `<span>${escapeHtml(app.name)}</span><span class="suggestion-section">${escapeHtml(sectionName)}</span>`;
    li.addEventListener("click", () => openUrl(app.url));
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openUrl(app.url);
    });
    el.suggestions.append(li);
  });

  if (apps.length) {
    el.suggestions.classList.remove("hidden");
  } else {
    el.suggestions.classList.add("hidden");
  }
}

function onLaunchSubmit(event) {
  event.preventDefault();
  const rawInput = el.launcherInput.value.trim();
  if (!rawInput) return;

  const appMatch = state.apps.find((app) => app.name.toLowerCase() === rawInput.toLowerCase());
  if (appMatch) {
    openUrl(appMatch.url);
    return;
  }

  const partialMatch = state.apps.find((app) => app.name.toLowerCase().includes(rawInput.toLowerCase()));
  if (partialMatch) {
    openUrl(partialMatch.url);
    return;
  }

  const asUrl = ensureUrl(rawInput);
  if (asUrl) {
    openUrl(asUrl);
    return;
  }

  openUrl(`https://www.google.com/search?q=${encodeURIComponent(rawInput)}`);
}

function openUrl(url) {
  window.location.href = url;
}

function ensureUrl(value) {
  if (!value) return "";

  try {
    return new URL(value).href;
  } catch {
    if (/^[\w.-]+\.[A-Za-z]{2,}/.test(value)) {
      try {
        return new URL(`https://${value}`).href;
      } catch {
        return "";
      }
    }
    return "";
  }
}

function faviconForUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "";
  }
}

function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const value = Number.parseInt(full, 16);

  if (Number.isNaN(value)) return `rgba(20, 24, 38, ${alpha})`;

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
