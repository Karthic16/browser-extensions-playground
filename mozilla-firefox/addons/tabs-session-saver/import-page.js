const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("status");

function generateId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await readFileAsText(file);
    const data = JSON.parse(text);

    function validateTab(t) {
      return t && typeof t.url === "string" && t.url.length > 0;
    }

    function cleanTab(t) {
      return {
        url: t.url,
        title: typeof t.title === "string" ? t.title : t.url,
      };
    }

    // Restore window structure if present, otherwise treat as single window
    const windowStructure = Array.isArray(data.windows) && data.windows.length > 0
      ? data.windows.map((w) => ({
          tabs: Array.isArray(w.tabs) ? w.tabs.filter(validateTab).map(cleanTab) : [],
        })).filter((w) => w.tabs.length > 0)
      : [{ tabs: data.tabs.filter(validateTab).map(cleanTab) }];

    const allTabs = windowStructure.flatMap((w) => w.tabs);

    if (allTabs.length === 0) {
      showStatus("No valid tabs found in file.", "error");
      return;
    }

    const result = await browser.storage.local.get("collections");
    const collections = result.collections || {};
    const id = generateId();
    const createdAt =
      data.createdAt && !isNaN(new Date(data.createdAt).getTime())
        ? data.createdAt
        : new Date().toISOString();

    collections[id] = {
      name: data.name + " (imported)",
      createdAt: createdAt,
      tabs: allTabs,
      windows: windowStructure,
      scope: data.scope || (windowStructure.length > 1 ? "all" : "current"),
      ...(windowStructure.length > 1 && { windowCount: windowStructure.length }),
    };

    await browser.storage.local.set({ collections });

    const tabWord = allTabs.length !== 1 ? "tabs" : "tab";
    const winNote = windowStructure.length > 1 ? " across " + windowStructure.length + " windows" : "";
    showStatus(
      "Imported " + allTabs.length + " " + tabWord + winNote + ". Closing\u2026",
      "success"
    );

    setTimeout(() => window.close(), 1800);
  } catch (err) {
    showStatus("Error: " + err.message, "error");
  }
});
