export async function copyShareText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Copy is not available in this browser.");
}

export async function shareUrl(title: string, url: string) {
  if (!navigator.share) throw new Error("System sharing is not available in this browser.");
  await navigator.share({ title, url });
}
