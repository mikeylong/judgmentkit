(() => {
  const script = document.currentScript;
  const appearance = window.matchMedia("(prefers-color-scheme: dark)");
  const icon = document.createElement("link");
  icon.rel = "icon";
  icon.type = "image/x-icon";
  icon.sizes = "16x16 32x32 48x48";
  icon.dataset.brandFavicon = "";
  const update = () => {
    icon.href = appearance.matches ? script.dataset.darkIcon : script.dataset.lightIcon;
  };
  update();
  document.head.append(icon);
  appearance.addEventListener("change", update);
})();
