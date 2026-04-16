document.addEventListener("DOMContentLoaded", async () => {
  // --- DOM Elements ---
  const saveBtn = document.getElementById("save-btn");
  const saveForm = document.getElementById("save-form");
  const collectionNameInput = document.getElementById("collection-name");
  const saveConfirmBtn = document.getElementById("save-confirm");
  const saveCancelBtn = document.getElementById("save-cancel");
  const collectionsList = document.getElementById("collections-list");
  const emptyState = document.getElementById("empty-state");
  const importBtn = document.getElementById("import-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const newWindowToggle = document.getElementById("new-window-toggle");
  const statusMsg = document.getElementById("status-msg");

  // --- Data Helpers ---

  function generateId() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async function getCollections() {
    const data = await browser.storage.local.get("collections");
    return data.collections || {};
  }

  async function saveCollections(collections) {
    await browser.storage.local.set({ collections });
  }

  async function getSettings() {
    const data = await browser.storage.local.get("settings");
    return data.settings || { restoreInNewWindow: true };
  }

  async function saveSettings(settings) {
    await browser.storage.local.set({ settings });
  }

  // --- Status Messages ---

  let statusTimeout = null;

  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = "status-msg " + type;
    statusMsg.classList.remove("hidden");
    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }
    statusTimeout = setTimeout(() => {
      statusMsg.classList.add("hidden");
    }, 3000);
  }

  // --- URL Filtering ---

  const INTERNAL_URL_PATTERN = /^(about:|moz-extension:|chrome:|data:|file:|javascript:)/;

  function isValidTab(tab) {
    return tab.url && !INTERNAL_URL_PATTERN.test(tab.url);
  }

  // --- Render Collections ---

  function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function renderCollections() {
    const collections = await getCollections();
    const entries = Object.entries(collections);

    collectionsList.innerHTML = "";

    if (entries.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    entries
      .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt))
      .forEach(([id, col]) => {
        const row = document.createElement("div");
        row.className = "collection-row";

        const info = document.createElement("div");
        info.className = "collection-info";
        info.dataset.action = "open";
        info.dataset.id = id;

        const name = document.createElement("div");
        name.className = "collection-name";
        name.textContent = col.name;
        name.title = col.name;

        const meta = document.createElement("div");
        meta.className = "collection-meta";
        meta.textContent = col.tabs.length + " tab" + (col.tabs.length !== 1 ? "s" : "") + " \u00B7 " + formatDate(col.createdAt);

        info.appendChild(name);
        info.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "collection-actions";

        const openBtn = document.createElement("button");
        openBtn.className = "btn btn-ghost";
        openBtn.textContent = "Open";
        openBtn.dataset.action = "open";
        openBtn.dataset.id = id;

        const exportBtn = document.createElement("button");
        exportBtn.className = "btn btn-ghost";
        exportBtn.textContent = "Export";
        exportBtn.dataset.action = "export";
        exportBtn.dataset.id = id;

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.dataset.action = "delete";
        deleteBtn.dataset.id = id;

        actions.appendChild(openBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(deleteBtn);

        row.appendChild(info);
        row.appendChild(actions);
        collectionsList.appendChild(row);
      });
  }

  // --- Save All Tabs ---

  function showSaveForm() {
    const now = new Date();
    collectionNameInput.value = "Tabs - " + now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    saveBtn.classList.add("hidden");
    saveForm.classList.remove("hidden");
    collectionNameInput.focus();
    collectionNameInput.select();
  }

  function hideSaveForm() {
    saveForm.classList.add("hidden");
    saveBtn.classList.remove("hidden");
  }

  async function saveAllTabs() {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const validTabs = tabs.filter(isValidTab).map((t) => ({
        url: t.url,
        title: t.title || t.url,
      }));

      if (validTabs.length === 0) {
        showStatus("No saveable tabs found (internal pages are excluded).", "error");
        hideSaveForm();
        return;
      }

      const name = collectionNameInput.value.trim() || "Untitled Collection";
      const collections = await getCollections();
      const id = generateId();

      collections[id] = {
        name: name,
        createdAt: new Date().toISOString(),
        tabs: validTabs,
      };

      await saveCollections(collections);
      hideSaveForm();
      await renderCollections();
      showStatus("Saved " + validTabs.length + " tab" + (validTabs.length !== 1 ? "s" : "") + ".", "success");
    } catch (err) {
      showStatus("Failed to save tabs: " + err.message, "error");
    }
  }

  // --- Restore Collection ---

  async function restoreCollection(id) {
    try {
      const collections = await getCollections();
      const col = collections[id];
      if (!col) {
        showStatus("Collection not found.", "error");
        return;
      }

      const urls = col.tabs.map((t) => t.url);
      const settings = await getSettings();

      if (settings.restoreInNewWindow) {
        await browser.windows.create({ url: urls });
      } else {
        for (const url of urls) {
          await browser.tabs.create({ url: url });
        }
      }
    } catch (err) {
      showStatus("Failed to open tabs: " + err.message, "error");
    }
  }

  // --- Delete Collection ---

  async function deleteCollection(id) {
    if (!confirm("Delete this collection?")) {
      return;
    }

    try {
      const collections = await getCollections();
      delete collections[id];
      await saveCollections(collections);
      await renderCollections();
      showStatus("Collection deleted.", "success");
    } catch (err) {
      showStatus("Failed to delete: " + err.message, "error");
    }
  }

  // --- Export Collection ---

  function sanitizeFilename(name) {
    return name.replace(/[/\\:*?"<>|]/g, "_");
  }

  async function exportCollection(id) {
    try {
      const collections = await getCollections();
      const col = collections[id];
      if (!col) {
        showStatus("Collection not found.", "error");
        return;
      }

      const exportData = {
        version: "1.0",
        name: col.name,
        createdAt: col.createdAt,
        exportedAt: new Date().toISOString(),
        tabs: col.tabs,
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const filename = "tabs-session-saver/" + sanitizeFilename(col.name) + ".json";

      // Delegate to background script so the blob URL survives after popup closes
      const result = await browser.runtime.sendMessage({
        action: "download",
        data: jsonStr,
        filename: filename,
      });

      if (result && result.success) {
        showStatus("Choose where to save \"" + col.name + "\".", "success");
      } else {
        showStatus("Failed to export: " + (result ? result.error : "Unknown error"), "error");
        return;
      }
    } catch (err) {
      showStatus("Failed to export: " + err.message, "error");
    }
  }

  // --- Import Collection ---
  // Opens import page in a small popup window (not a tab).
  // The popup closes when the file picker steals focus, so we listen
  // for storage changes to refresh the collection list when it reopens.

  function importCollection() {
    browser.windows.create({
      url: browser.runtime.getURL("import-page.html"),
      type: "popup",
      width: 500,
      height: 450,
    });
  }

  // Refresh collections when storage changes (e.g. after import from the popup window)
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.collections) {
      renderCollections();
    }
  });

  // --- Event Delegation for Collection Actions ---

  collectionsList.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const { action, id } = target.dataset;

    if (action === "open") await restoreCollection(id);
    if (action === "delete") await deleteCollection(id);
    if (action === "export") await exportCollection(id);
  });

  // --- Event Listeners ---

  saveBtn.addEventListener("click", showSaveForm);
  saveCancelBtn.addEventListener("click", hideSaveForm);
  saveConfirmBtn.addEventListener("click", saveAllTabs);

  collectionNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveAllTabs();
    if (e.key === "Escape") hideSaveForm();
  });

  importBtn.addEventListener("click", importCollection);

  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  newWindowToggle.addEventListener("change", async () => {
    const settings = await getSettings();
    settings.restoreInNewWindow = newWindowToggle.checked;
    await saveSettings(settings);
  });

  // --- Initialize ---

  const [, settings] = await Promise.all([renderCollections(), getSettings()]);
  newWindowToggle.checked = settings.restoreInNewWindow;
});
