async (page) => {
  const cases = [];
  for (const [version, route] of [
    ["original", "snapshot-R1-accepted-before-label-fix/dist/index.html"],
    ["repaired", "dist/index.html"],
  ]) {
    await page.goto(`http://127.0.0.1:4326/${route}`);
    await page.waitForSelector("svg.tide-chart");
    for (const viewport of [{id:"desktop",width:1280,height:800},{id:"mobile",width:390,height:844}]) {
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      const selections = await page.evaluate(() => ({
        stations: Array.from(document.querySelector("#location").options, o => o.value),
        dates: Array.from(document.querySelector("#day").options, o => o.value),
      }));
      for (const station of selections.stations) for (const date of selections.dates) {
        await page.getByRole("combobox", {name:"Coastal location"}).selectOption(station);
        await page.getByRole("combobox", {name:"Day", exact:true}).selectOption(date);
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        const snapshot = await page.evaluate(() => {
          const root = document.documentElement.cloneNode(true);
          root.querySelectorAll("script,link[rel=stylesheet]").forEach(node => node.remove());
          const style = document.createElement("style");
          style.textContent = Array.from(document.styleSheets, sheet => Array.from(sheet.cssRules, rule => rule.cssText).join("\n")).join("\n");
          root.querySelector("head").append(style);
          document.querySelectorAll("select").forEach(select => {
            const copy = root.querySelector(`#${select.id}`);
            copy.querySelectorAll("option").forEach(option => option.toggleAttribute("selected", option.value === select.value));
          });
          const svg = document.querySelector("svg.tide-chart");
          return {rendered_html: "<!doctype html>" + root.outerHTML,
            view_box: svg.getAttribute("viewBox"),
            scale_min: svg.dataset.scaleMin,
            scale_max: svg.dataset.scaleMax};
        });
        cases.push({version, viewport, station, date, ...snapshot});
      }
    }
  }
  return cases;
}
