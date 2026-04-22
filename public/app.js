const form = document.getElementById("download-form");
const statusText = document.getElementById("status-text");
const submitButton = document.getElementById("submit-button");

function setStatus(message, state = "idle") {
  statusText.textContent = message;
  statusText.dataset.state = state;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    urls: formData.get("urls"),
    format: formData.get("format"),
  };

  submitButton.disabled = true;
  setStatus("Indirme hazirlaniyor. Link sayisina gore bu biraz surebilir.");

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Indirme istegi basarisiz oldu.");
    }

    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match ? match[1] : `download.${payload.format}`;
    const blob = await response.blob();

    downloadBlob(blob, fileName);
    setStatus("Dosya hazirlandi ve indirme baslatildi.", "success");
  } catch (error) {
    setStatus(error.message || "Beklenmeyen bir hata olustu.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
