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

    if (typeof data.name !== "string" || !Array.isArray(data.tabs)) {
      showStatus("Invalid file: missing name or tabs array.", "error");
      return;
    }

    const validTabs = data.tabs
      .filter((t) => t && typeof t.url === "string" && t.url.length > 0)
      .map((t) => ({
        url: t.url,
        title: typeof t.title === "string" ? t.title : t.url,
      }));

    if (validTabs.length === 0) {
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
      tabs: validTabs,
    };

    await browser.storage.local.set({ collections });

    showStatus(
      "Imported " + validTabs.length + " tab" + (validTabs.length !== 1 ? "s" : "") + ". Closing\u2026",
      "success"
    );

    setTimeout(() => window.close(), 1800);
  } catch (err) {
    showStatus("Error: " + err.message, "error");
  }
});
