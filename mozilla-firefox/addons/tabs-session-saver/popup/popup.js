document.addEventListener("DOMContentLoaded", async () => {
  // --- DOM Elements ---
  const saveBtn = document.getElementById("save-btn");
  const scopePicker = document.getElementById("scope-picker");
  const scopeCurrentBtn = document.getElementById("scope-current");
  const scopeAllBtn = document.getElementById("scope-all");
  const windowSelector = document.getElementById("window-selector");
  const windowsList = document.getElementById("windows-list");
  const windowsConfirmBtn = document.getElementById("windows-confirm");
  const windowsCancelBtn = document.getElementById("windows-cancel");
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

  // Tracks scope and window selections
  let saveScope = "current";
  let allWindows = [];
  let selectedWindowIds = new Set();
  // Captured at "Continue" click — window tab data ready for saveAllTabs()
  let pendingWindowsData = null;

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
        const tabWord = col.tabs.length !== 1 ? "tabs" : "tab";
        const windowBadge = col.scope === "all" && col.windowCount > 1
          ? " \u00B7 " + col.windowCount + " windows"
          : "";
        meta.textContent = col.tabs.length + " " + tabWord + windowBadge + " \u00B7 " + formatDate(col.createdAt);

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

  function showScopePicker() {
    saveBtn.classList.add("hidden");
    scopePicker.classList.remove("hidden");
  }

  async function showWindowSelector() {
    saveScope = "all";
    scopePicker.classList.add("hidden");
    allWindows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
    selectedWindowIds = new Set(allWindows.map((w) => w.id));

    renderWindowSelector();
    windowSelector.classList.remove("hidden");
  }

  function renderWindowSelector() {
    windowsList.innerHTML = "";

    allWindows.forEach((win) => {
      const validTabs = win.tabs.filter(isValidTab);
      const card = document.createElement("div");
      card.className = "window-card";

      const header = document.createElement("div");
      header.className = "window-card-header";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedWindowIds.has(win.id);
      checkbox.dataset.windowId = win.id;
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedWindowIds.add(win.id);
        } else {
          selectedWindowIds.delete(win.id);
        }
      });

      const title = document.createElement("div");
      title.className = "window-card-title";
      title.textContent = "Window " + (allWindows.indexOf(win) + 1);

      const tabCount = document.createElement("div");
      tabCount.className = "window-tab-count";
      tabCount.textContent = validTabs.length + " tab" + (validTabs.length !== 1 ? "s" : "");

      header.appendChild(checkbox);
      header.appendChild(title);
      header.appendChild(tabCount);
      card.appendChild(header);

      if (validTabs.length > 0) {
        const preview = document.createElement("div");
        preview.className = "window-tabs-preview";
        validTabs.slice(0, 3).forEach((tab) => {
          const tabItem = document.createElement("div");
          tabItem.className = "window-tab-item";
          tabItem.title = tab.title || tab.url;
          tabItem.textContent = "• " + (tab.title || tab.url);
          preview.appendChild(tabItem);
        });
        if (validTabs.length > 3) {
          const more = document.createElement("div");
          more.className = "window-tab-item";
          more.textContent = "• +" + (validTabs.length - 3) + " more";
          preview.appendChild(more);
        }
        card.appendChild(preview);
      }

      windowsList.appendChild(card);
    });
  }

  function confirmWindowSelection() {
    const selectedWins = allWindows.filter((w) => selectedWindowIds.has(w.id));
    if (selectedWins.length === 0) {
      showStatus("Select at least one window.", "error");
      return;
    }

    // Capture window + tab data right now, before anything can change
    pendingWindowsData = selectedWins.map((win) => ({
      tabs: win.tabs.filter(isValidTab).map((t) => ({
        url: t.url,
        title: t.title || t.url,
      })),
    }));

    showSaveForm("all");
  }

  function showSaveForm(scope) {
    saveScope = scope;
    scopePicker.classList.add("hidden");
    windowSelector.classList.add("hidden");

    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    collectionNameInput.value = (scope === "all" ? "All Windows - " : "Tabs - ") + dateStr;
    saveForm.classList.remove("hidden");
    collectionNameInput.focus();
    collectionNameInput.select();
  }

  function hideSaveFlow() {
    scopePicker.classList.add("hidden");
    windowSelector.classList.add("hidden");
    saveForm.classList.add("hidden");
    saveBtn.classList.remove("hidden");
    saveScope = "current";
    selectedWindowIds.clear();
    allWindows = [];
    pendingWindowsData = null;
  }

  async function saveAllTabs() {
    try {
      let windowStructure = null;
      let totalTabCount = 0;
      let windowCount = 1;

      if (saveScope === "all") {
        if (!pendingWindowsData || pendingWindowsData.length === 0) {
          showStatus("No windows selected.", "error");
          return;
        }

        windowStructure = pendingWindowsData;
        windowCount = windowStructure.length;
        totalTabCount = windowStructure.reduce((sum, w) => sum + w.tabs.length, 0);
      } else {
        const tabs = await browser.tabs.query({ currentWindow: true });
        const validTabs = tabs.filter(isValidTab).map((t) => ({
          url: t.url,
          title: t.title || t.url,
        }));
        totalTabCount = validTabs.length;
        windowStructure = [{ tabs: validTabs }];
      }

      if (totalTabCount === 0) {
        showStatus("No saveable tabs found (internal pages are excluded).", "error");
        hideSaveFlow();
        return;
      }

      const name = collectionNameInput.value.trim() || "Untitled Collection";
      const collections = await getCollections();
      const id = generateId();

      collections[id] = {
        name: name,
        createdAt: new Date().toISOString(),
        tabs: windowStructure.flatMap((w) => w.tabs),
        windows: windowStructure,
        scope: saveScope,
        ...(saveScope === "all" && { windowCount }),
      };

      await saveCollections(collections);
      hideSaveFlow();
      await renderCollections();

      const tabWord = totalTabCount !== 1 ? "tabs" : "tab";
      const msg = saveScope === "all"
        ? "Saved " + totalTabCount + " " + tabWord + " across " + windowCount + " window" + (windowCount !== 1 ? "s" : "") + "."
        : "Saved " + totalTabCount + " " + tabWord + ".";
      showStatus(msg, "success");
    } catch (err) {
      showStatus("Failed to save tabs: " + err.message, "error");
    }
  }

  // --- Restore Collection ---
  // Delegated to the background script so popup closure (caused by a new
  // window taking focus) doesn't interrupt the restore loop mid-way.

  async function restoreCollection(id) {
    try {
      const collections = await getCollections();
      const col = collections[id];
      if (!col) {
        showStatus("Collection not found.", "error");
        return;
      }

      const settings = await getSettings();
      const windows = col.windows || [{ tabs: col.tabs }];
      const totalTabs = windows.reduce((sum, w) => sum + w.tabs.length, 0);

      const result = await browser.runtime.sendMessage({
        action: "restoreWindows",
        windows,
        restoreInNewWindow: settings.restoreInNewWindow,
      });

      if (result && result.success) {
        const tabWord = totalTabs !== 1 ? "tabs" : "tab";
        const winMsg = windows.length > 1 ? " across " + windows.length + " windows" : "";
        showStatus("Restored " + totalTabs + " " + tabWord + winMsg + ".", "success");
      } else {
        showStatus("Failed to open tabs: " + (result ? result.error : "Unknown error"), "error");
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
        scope: col.scope || "current",
        windows: col.windows || [{ tabs: col.tabs }],
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

  saveBtn.addEventListener("click", showScopePicker);
  scopeCurrentBtn.addEventListener("click", () => showSaveForm("current"));
  scopeAllBtn.addEventListener("click", showWindowSelector);
  windowsConfirmBtn.addEventListener("click", confirmWindowSelection);
  windowsCancelBtn.addEventListener("click", hideSaveFlow);
  saveCancelBtn.addEventListener("click", hideSaveFlow);
  saveConfirmBtn.addEventListener("click", saveAllTabs);

  collectionNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveAllTabs();
    if (e.key === "Escape") hideSaveFlow();
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
