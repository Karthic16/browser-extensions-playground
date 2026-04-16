// Background script - persists independently of the popup.
// Handles downloads so blob URLs survive after the popup closes.

browser.runtime.onMessage.addListener(async (message) => {
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
