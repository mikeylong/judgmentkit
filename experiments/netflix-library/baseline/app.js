const titles = [
  {
    id: "silent-signal",
    title: "The Silent Signal",
    type: "Series",
    genre: "Sci-Fi",
    year: 2026,
    maturity: "TV-14",
    runtime: 48,
    episodes: "6 Episodes",
    match: 98,
    isNew: true,
    rank: 1,
    progress: 64,
    cast: "Mara Vale, Dev Arman, Sloane Kite",
    synopsis:
      "A vanished satellite starts broadcasting memories nobody should have, sending a systems analyst through hidden rooms of the global streaming grid.",
    palette: ["#33040a", "#121827", "rgba(229, 9, 20, 0.76)", "rgba(52, 172, 255, 0.62)"]
  },
  {
    id: "midnight-protocol",
    title: "Midnight Protocol",
    type: "Film",
    genre: "Thriller",
    year: 2025,
    maturity: "R",
    runtime: 119,
    episodes: "1h 59m",
    match: 96,
    isNew: true,
    rank: 2,
    progress: 0,
    cast: "Nico Reyes, Hallie Frost, Ben Okafor",
    synopsis:
      "A courier with one encrypted drive has six hours to cross a locked-down city before every camera in town turns against him.",
    palette: ["#1b1018", "#071416", "rgba(245, 64, 64, 0.72)", "rgba(0, 214, 190, 0.45)"]
  },
  {
    id: "copper-coast",
    title: "Copper Coast",
    type: "Series",
    genre: "Drama",
    year: 2024,
    maturity: "TV-MA",
    runtime: 55,
    episodes: "3 Seasons",
    match: 94,
    isNew: false,
    rank: 8,
    progress: 22,
    cast: "Elena Marsh, Troy Ives, Kim Sol",
    synopsis:
      "On a weather-battered island, a family salvage business becomes the center of a fight over a shipwreck worth more than the town itself.",
    palette: ["#271910", "#0d1d1f", "rgba(230, 139, 57, 0.7)", "rgba(61, 184, 184, 0.42)"]
  },
  {
    id: "afterimage",
    title: "Afterimage",
    type: "Film",
    genre: "Mystery",
    year: 2026,
    maturity: "PG-13",
    runtime: 104,
    episodes: "1h 44m",
    match: 92,
    isNew: true,
    rank: 5,
    progress: 0,
    cast: "Iris Chen, Dax Monroe, Amara Pike",
    synopsis:
      "A forensic photographer notices the same impossible figure inside unrelated crime-scene negatives and follows the trail into her own past.",
    palette: ["#160f22", "#07100e", "rgba(148, 91, 255, 0.68)", "rgba(44, 221, 160, 0.48)"]
  },
  {
    id: "kingdom-of-static",
    title: "Kingdom of Static",
    type: "Series",
    genre: "Fantasy",
    year: 2023,
    maturity: "TV-14",
    runtime: 51,
    episodes: "2 Seasons",
    match: 89,
    isNew: false,
    rank: 10,
    progress: 78,
    cast: "Anika Ro, Miles Cairn, Jules Ember",
    synopsis:
      "A pirate radio host inherits a crown in a realm where magic travels by broadcast and silence is a weapon.",
    palette: ["#21120c", "#181229", "rgba(255, 184, 77, 0.68)", "rgba(115, 82, 255, 0.45)"]
  },
  {
    id: "northbound",
    title: "Northbound",
    type: "Film",
    genre: "Action",
    year: 2025,
    maturity: "PG-13",
    runtime: 132,
    episodes: "2h 12m",
    match: 91,
    isNew: false,
    rank: 3,
    progress: 36,
    cast: "Cole Vargas, Priya Bell, Anders Ly",
    synopsis:
      "A retired rescue pilot crosses the Arctic in one last flight when a research crew disappears during a blackout storm.",
    palette: ["#08151b", "#121621", "rgba(62, 180, 255, 0.7)", "rgba(255, 255, 255, 0.44)"]
  },
  {
    id: "little-planet",
    title: "Little Planet",
    type: "Series",
    genre: "Family",
    year: 2026,
    maturity: "TV-PG",
    runtime: 29,
    episodes: "10 Episodes",
    match: 87,
    isNew: true,
    rank: 0,
    progress: 12,
    cast: "Tessa Moon, Leo Grant, Mina Fox",
    synopsis:
      "Three siblings discover a pocket-sized world in their apartment building and become its reluctant weather system.",
    palette: ["#14220f", "#091923", "rgba(111, 211, 85, 0.72)", "rgba(52, 172, 255, 0.54)"]
  },
  {
    id: "paper-heist",
    title: "Paper Heist",
    type: "Film",
    genre: "Comedy",
    year: 2024,
    maturity: "PG-13",
    runtime: 101,
    episodes: "1h 41m",
    match: 85,
    isNew: false,
    rank: 0,
    progress: 0,
    cast: "Sami Reed, Vera Long, Quinn Patel",
    synopsis:
      "A broke stationery store crew plans a fake robbery for insurance money and accidentally steals a cartel's ledger instead.",
    palette: ["#24120e", "#211f0e", "rgba(255, 101, 73, 0.74)", "rgba(255, 217, 77, 0.48)"]
  },
  {
    id: "blue-hour",
    title: "Blue Hour",
    type: "Film",
    genre: "Romance",
    year: 2023,
    maturity: "PG-13",
    runtime: 112,
    episodes: "1h 52m",
    match: 83,
    isNew: false,
    rank: 0,
    progress: 0,
    cast: "Maya St. James, Theo Park, Lina Osei",
    synopsis:
      "Two night-shift strangers meet on the same bridge every morning, trading favors until one of them has to leave before sunrise.",
    palette: ["#0b1024", "#201326", "rgba(70, 121, 255, 0.68)", "rgba(255, 122, 193, 0.48)"]
  },
  {
    id: "red-valley",
    title: "Red Valley",
    type: "Series",
    genre: "Western",
    year: 2025,
    maturity: "TV-MA",
    runtime: 57,
    episodes: "8 Episodes",
    match: 90,
    isNew: true,
    rank: 4,
    progress: 0,
    cast: "Rafa Stone, June Calder, Beck Slate",
    synopsis:
      "A frontier surgeon runs the only clinic between two rival rail towns and keeps a ledger of every secret paid in blood.",
    palette: ["#2a0d0b", "#20160c", "rgba(210, 47, 37, 0.72)", "rgba(224, 151, 65, 0.5)"]
  },
  {
    id: "deep-index",
    title: "Deep Index",
    type: "Documentary",
    genre: "Documentary",
    year: 2026,
    maturity: "TV-14",
    runtime: 44,
    episodes: "4 Episodes",
    match: 88,
    isNew: true,
    rank: 6,
    progress: 44,
    cast: "Narrated by Asha Kel",
    synopsis:
      "Investigators follow the hidden economics of search results, recommendation engines, and the people trying to make them accountable.",
    palette: ["#0a1717", "#141414", "rgba(43, 220, 205, 0.62)", "rgba(229, 9, 20, 0.42)"]
  },
  {
    id: "orbit-kitchen",
    title: "Orbit Kitchen",
    type: "Series",
    genre: "Reality",
    year: 2024,
    maturity: "TV-PG",
    runtime: 41,
    episodes: "2 Seasons",
    match: 82,
    isNew: false,
    rank: 0,
    progress: 58,
    cast: "Rin Tala, Mateo Crisp, Jun Bell",
    synopsis:
      "Chefs compete inside a rotating space habitat where every round changes gravity, pantry access, and the shape of dinner.",
    palette: ["#191715", "#101b26", "rgba(255, 138, 56, 0.7)", "rgba(92, 176, 255, 0.5)"]
  },
  {
    id: "velvet-mile",
    title: "Velvet Mile",
    type: "Film",
    genre: "Drama",
    year: 2022,
    maturity: "R",
    runtime: 126,
    episodes: "2h 06m",
    match: 80,
    isNew: false,
    rank: 0,
    progress: 0,
    cast: "Noor Ellis, Graeme Hart, Ilya Dove",
    synopsis:
      "A jazz pianist returns home for one weekend and finds the club that made her famous scheduled for demolition.",
    palette: ["#220b18", "#16100e", "rgba(181, 48, 120, 0.68)", "rgba(240, 180, 83, 0.44)"]
  },
  {
    id: "harbor-nine",
    title: "Harbor Nine",
    type: "Series",
    genre: "Crime",
    year: 2025,
    maturity: "TV-MA",
    runtime: 53,
    episodes: "9 Episodes",
    match: 93,
    isNew: false,
    rank: 7,
    progress: 19,
    cast: "Talia Knox, Ruben Vale, Cass Ito",
    synopsis:
      "A detective unit assigned to waterfront disappearances uncovers a shipping route that exists on no map.",
    palette: ["#0c1419", "#160d12", "rgba(44, 118, 195, 0.64)", "rgba(229, 9, 20, 0.44)"]
  },
  {
    id: "last-light-club",
    title: "Last Light Club",
    type: "Series",
    genre: "Comedy",
    year: 2026,
    maturity: "TV-14",
    runtime: 31,
    episodes: "8 Episodes",
    match: 86,
    isNew: true,
    rank: 0,
    progress: 0,
    cast: "Demi Shaw, Ollie King, Nia Brooks",
    synopsis:
      "Four retired stage magicians reopen their old theater and discover their new audience expects actual miracles.",
    palette: ["#26110d", "#1c1023", "rgba(245, 86, 55, 0.7)", "rgba(177, 88, 255, 0.44)"]
  },
  {
    id: "shoreline-zero",
    title: "Shoreline Zero",
    type: "Film",
    genre: "Sci-Fi",
    year: 2024,
    maturity: "PG-13",
    runtime: 116,
    episodes: "1h 56m",
    match: 84,
    isNew: false,
    rank: 0,
    progress: 0,
    cast: "Ezra Holt, Mira Lane, Sun Kim",
    synopsis:
      "When the ocean recedes overnight, a cartographer maps the exposed ruins before the tide returns with something awake inside it.",
    palette: ["#071a1f", "#130f1d", "rgba(38, 199, 230, 0.66)", "rgba(125, 79, 255, 0.45)"]
  },
  {
    id: "glass-athena",
    title: "Glass Athena",
    type: "Film",
    genre: "Action",
    year: 2026,
    maturity: "R",
    runtime: 108,
    episodes: "1h 48m",
    match: 90,
    isNew: true,
    rank: 9,
    progress: 0,
    cast: "Kira Moss, Lena Vaughn, Peter Sohn",
    synopsis:
      "A museum security chief and an art thief are trapped together during a gala attack staged to erase one priceless witness.",
    palette: ["#101116", "#22110c", "rgba(255, 255, 255, 0.48)", "rgba(229, 9, 20, 0.6)"]
  },
  {
    id: "syntax-of-love",
    title: "Syntax of Love",
    type: "Series",
    genre: "Romance",
    year: 2025,
    maturity: "TV-14",
    runtime: 36,
    episodes: "12 Episodes",
    match: 81,
    isNew: false,
    rank: 0,
    progress: 71,
    cast: "Aya Flores, Miles Ren, Hana Bly",
    synopsis:
      "Two rival localization writers keep rewriting the same rom-com subtitles until their private jokes take over the translation.",
    palette: ["#1f1020", "#111d1c", "rgba(255, 115, 181, 0.66)", "rgba(78, 221, 181, 0.44)"]
  }
];

const state = {
  genre: "All",
  nav: "All",
  query: "",
  sort: "match",
  dense: false,
  selectedId: "silent-signal",
  saved: new Set(JSON.parse(localStorage.getItem("netflix-library-list") || "[]"))
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  genreFilters: document.querySelector("#genreFilters"),
  sortSelect: document.querySelector("#sortSelect"),
  continueRail: document.querySelector("#continueRail"),
  topRail: document.querySelector("#topRail"),
  libraryGrid: document.querySelector("#libraryGrid"),
  resultSummary: document.querySelector("#resultSummary"),
  emptyState: document.querySelector("#emptyState"),
  gridViewButton: document.querySelector("#gridViewButton"),
  denseViewButton: document.querySelector("#denseViewButton"),
  totalTitles: document.querySelector("#totalTitles"),
  newTitles: document.querySelector("#newTitles"),
  listCount: document.querySelector("#listCount"),
  dialog: document.querySelector("#titleDialog"),
  dialogVisual: document.querySelector("#dialogVisual"),
  dialogType: document.querySelector("#dialogType"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogMeta: document.querySelector("#dialogMeta"),
  dialogSynopsis: document.querySelector("#dialogSynopsis"),
  dialogCast: document.querySelector("#dialogCast"),
  dialogListButton: document.querySelector("#dialogListButton"),
  dialogPlayButton: document.querySelector("#dialogPlayButton"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  heroPlayButton: document.querySelector("#heroPlayButton"),
  heroInfoButton: document.querySelector("#heroInfoButton")
};

function saveList() {
  localStorage.setItem("netflix-library-list", JSON.stringify([...state.saved]));
}

function cssPalette(title) {
  const [posterA, posterB, accentA, accentB] = title.palette;
  return `--poster-a:${posterA};--poster-b:${posterB};--accent-a:${accentA};--accent-b:${accentB};--progress:${title.progress}%`;
}

function titleRuntime(title) {
  return title.type === "Film" ? title.episodes : `${title.episodes} - ${title.runtime}m avg`;
}

function matchesNav(title) {
  if (state.nav === "All") return true;
  if (state.nav === "New") return title.isNew;
  if (state.nav === "My List") return state.saved.has(title.id);
  return title.type === state.nav;
}

function getFilteredTitles() {
  const query = state.query.trim().toLowerCase();
  const filtered = titles.filter((title) => {
    const searchable = `${title.title} ${title.genre} ${title.type} ${title.cast} ${title.synopsis}`.toLowerCase();
    const genreMatch = state.genre === "All" || title.genre === state.genre;
    return matchesNav(title) && genreMatch && (!query || searchable.includes(query));
  });

  return filtered.sort((a, b) => {
    if (state.sort === "newest") return b.year - a.year || b.match - a.match;
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "runtime") return b.runtime - a.runtime;
    return b.match - a.match;
  });
}

function createCard(title, options = {}) {
  const card = document.createElement("article");
  card.className = "title-card";
  card.innerHTML = `
    <button class="title-card-button" type="button" aria-label="Open ${title.title}">
      <div class="poster" data-title="${title.title}" style="${cssPalette(title)}">
        ${options.showRank && title.rank ? `<span class="top-rank">${title.rank}</span>` : ""}
      </div>
      <div class="card-meta">
        <div class="card-row">
          <h3 class="card-title">${title.title}</h3>
          <span class="match">${title.match}%</span>
        </div>
        <p class="detail-line">${title.year} - ${title.maturity} - ${title.genre}</p>
        ${title.progress ? `<div class="progress-track" aria-label="${title.progress}% watched"><div class="progress-fill" style="--progress:${title.progress}%"></div></div>` : ""}
      </div>
    </button>
    <div class="quick-actions" aria-label="${title.title} actions">
      <button class="tiny-action" type="button" data-action="play" aria-label="Play ${title.title}"><span class="play-glyph" aria-hidden="true"></span></button>
      <button class="tiny-action" type="button" data-action="list" aria-label="${state.saved.has(title.id) ? "Remove from" : "Add to"} My List">${state.saved.has(title.id) ? "-" : "+"}</button>
    </div>
  `;

  card.querySelector(".title-card-button").addEventListener("click", () => openDialog(title.id));
  card.querySelector('[data-action="play"]').addEventListener("click", (event) => {
    event.stopPropagation();
    openDialog(title.id, true);
  });
  card.querySelector('[data-action="list"]').addEventListener("click", (event) => {
    event.stopPropagation();
    toggleList(title.id);
  });
  return card;
}

function renderGenres() {
  const genres = ["All", ...new Set(titles.map((title) => title.genre).sort())];
  elements.genreFilters.replaceChildren(
    ...genres.map((genre) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-chip${genre === state.genre ? " is-active" : ""}`;
      button.textContent = genre;
      button.addEventListener("click", () => {
        state.genre = genre;
        render();
      });
      return button;
    })
  );
}

function renderRail(container, railTitles, options) {
  container.replaceChildren(...railTitles.map((title) => createCard(title, options)));
}

function renderLibrary() {
  const filtered = getFilteredTitles();
  elements.libraryGrid.classList.toggle("is-dense", state.dense);
  elements.libraryGrid.replaceChildren(...filtered.map((title) => createCard(title)));
  elements.emptyState.hidden = filtered.length > 0;

  const noun = filtered.length === 1 ? "title" : "titles";
  const queryText = state.query ? ` matching "${state.query}"` : "";
  const filterText = [state.nav !== "All" ? state.nav : "", state.genre !== "All" ? state.genre : ""]
    .filter(Boolean)
    .join(" / ");
  elements.resultSummary.textContent = `Showing ${filtered.length} ${noun}${filterText ? ` in ${filterText}` : ""}${queryText}`;
}

function renderStats() {
  elements.totalTitles.textContent = titles.length;
  elements.newTitles.textContent = titles.filter((title) => title.isNew).length;
  elements.listCount.textContent = state.saved.size;
}

function renderViewButtons() {
  elements.gridViewButton.classList.toggle("is-active", !state.dense);
  elements.denseViewButton.classList.toggle("is-active", state.dense);
}

function renderNavButtons() {
  document.querySelectorAll("[data-nav-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.navFilter === state.nav);
  });
}

function render() {
  renderGenres();
  renderRail(
    elements.continueRail,
    titles.filter((title) => title.progress > 0).sort((a, b) => b.progress - a.progress).slice(0, 8)
  );
  renderRail(
    elements.topRail,
    titles.filter((title) => title.rank > 0).sort((a, b) => a.rank - b.rank),
    { showRank: true }
  );
  renderLibrary();
  renderStats();
  renderViewButtons();
  renderNavButtons();
}

function setDialogPalette(title) {
  const [posterA, posterB, accentA, accentB] = title.palette;
  elements.dialogVisual.style.setProperty("--poster-a", posterA);
  elements.dialogVisual.style.setProperty("--poster-b", posterB);
  elements.dialogVisual.style.setProperty("--accent-a", accentA);
  elements.dialogVisual.style.setProperty("--accent-b", accentB);
}

function setDialogPlayLabel(label) {
  elements.dialogPlayButton.innerHTML = `<span class="play-glyph" aria-hidden="true"></span>${label}`;
}

function openDialog(id, autoplay = false) {
  const title = titles.find((item) => item.id === id);
  if (!title) return;

  state.selectedId = id;
  setDialogPalette(title);
  elements.dialogType.textContent = title.type;
  elements.dialogTitle.textContent = title.title;
  elements.dialogMeta.replaceChildren(
    ...[`${title.match}% Match`, String(title.year), title.maturity, titleRuntime(title)].map((item) => {
      const span = document.createElement("span");
      span.textContent = item;
      return span;
    })
  );
  elements.dialogSynopsis.textContent = title.synopsis;
  elements.dialogCast.textContent = `Cast: ${title.cast}`;
  elements.dialogListButton.classList.toggle("is-saved", state.saved.has(id));
  elements.dialogListButton.textContent = state.saved.has(id) ? "-" : "+";
  elements.dialogListButton.setAttribute("aria-label", `${state.saved.has(id) ? "Remove from" : "Add to"} My List`);
  setDialogPlayLabel(autoplay ? "Playing Preview" : "Play");

  if (elements.dialog.open) {
    return;
  }

  if (typeof elements.dialog.showModal === "function") {
    elements.dialog.showModal();
  } else {
    elements.dialog.setAttribute("open", "");
  }
}

function closeDialog() {
  elements.dialog.close();
  setDialogPlayLabel("Play");
}

function toggleList(id) {
  if (state.saved.has(id)) {
    state.saved.delete(id);
  } else {
    state.saved.add(id);
  }
  saveList();
  render();
  if (elements.dialog.open && state.selectedId === id) {
    openDialog(id);
  }
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderLibrary();
});

elements.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderLibrary();
});

elements.gridViewButton.addEventListener("click", () => {
  state.dense = false;
  renderViewButtons();
  renderLibrary();
});

elements.denseViewButton.addEventListener("click", () => {
  state.dense = true;
  renderViewButtons();
  renderLibrary();
});

document.querySelectorAll("[data-nav-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.nav = button.dataset.navFilter;
    render();
  });
});

elements.dialogListButton.addEventListener("click", () => toggleList(state.selectedId));
elements.dialogPlayButton.addEventListener("click", () => {
  setDialogPlayLabel("Playing Preview");
});
elements.closeDialogButton.addEventListener("click", closeDialog);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeDialog();
});
elements.heroPlayButton.addEventListener("click", () => openDialog("silent-signal", true));
elements.heroInfoButton.addEventListener("click", () => openDialog("silent-signal"));

render();
