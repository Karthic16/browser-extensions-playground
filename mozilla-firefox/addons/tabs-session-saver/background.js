// Background script - persists independently of the popup.
// Handles downloads and session restores so they survive popup closure.

browser.runtime.onMessage.addListener(async (message) => {
  // --- Restore Session ---
  // Popup closure (triggered by a new window gaining focus) would kill an
  // async loop mid-way. Running restore here avoids that entirely.
  if (message.action === "restoreWindows") {
    const { windows, restoreInNewWindow } = message;
    try {
      if (windows.length > 1) {
        for (const win of windows) {
          const urls = win.tabs.map((t) => t.url);
          if (urls.length > 0) {
            await browser.windows.create({ url: urls });
          }
        }
      } else {
        const urls = windows[0].tabs.map((t) => t.url);
        if (restoreInNewWindow) {
          await browser.windows.create({ url: urls });
        } else {
          for (const url of urls) {
            await browser.tabs.create({ url });
          }
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  if (message.action === "download") {
    const blob = new Blob([message.data], { type: "application/json" });
    const blobUrl = URL.createObjectURL(blob);

    try {
      const downloadId = await browser.downloads.download({
        url: blobUrl,
        filename: message.filename,
        saveAs: true,
      });

      function onChanged(delta) {
        if (
          delta.id === downloadId &&
          delta.state &&
          (delta.state.current === "complete" || delta.state.current === "interrupted")
        ) {
          URL.revokeObjectURL(blobUrl);
          browser.downloads.onChanged.removeListener(onChanged);
        }
      }
      browser.downloads.onChanged.addListener(onChanged);

      // Fallback revocation after 10 minutes
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);

      return { success: true };
    } catch (err) {
      URL.revokeObjectURL(blobUrl);
      return { success: false, error: err.message };
    }
  }
});
