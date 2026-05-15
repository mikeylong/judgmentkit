const image = (id, width = 900, height = 1350) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=82`;

const titles = [
  {
    id: "midnight-protocol",
    title: "Midnight Protocol",
    type: "Series",
    year: 2026,
    rating: "TV-14",
    match: 98,
    runtime: "8 episodes",
    genres: ["Thriller", "Sci-Fi", "New"],
    rows: ["Trending Now", "New Releases", "Sci-Fi Worlds"],
    cast: ["Alina Reyes", "Theo Grant", "Mara Voss"],
    summary:
      "A crisis negotiator discovers the citywide blackout is a cover for an encrypted coup, and every answer she unlocks makes her the next target.",
    image: image("photo-1519608487953-e999c86e7455", 900, 1350),
    backdrop: image("photo-1519608487953-e999c86e7455", 1800, 1000),
    hero: true,
    myList: true,
    progress: 36
  },
  {
    id: "northern-lights",
    title: "Northern Lights",
    type: "Movie",
    year: 2025,
    rating: "PG-13",
    match: 95,
    runtime: "2h 08m",
    genres: ["Drama", "Romance"],
    rows: ["Award Season", "Popular Films"],
    cast: ["Mae Cullen", "Jon Bell", "Elise Park"],
    summary:
      "Two strangers stranded after a polar rail delay find one impossible night to decide whether their lives should keep moving in opposite directions.",
    image: image("photo-1519681393784-d120267933ba", 900, 1350),
    backdrop: image("photo-1519681393784-d120267933ba", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "city-of-echoes",
    title: "City of Echoes",
    type: "Series",
    year: 2024,
    rating: "TV-MA",
    match: 93,
    runtime: "3 seasons",
    genres: ["Crime", "Thriller"],
    rows: ["Trending Now", "Crime Thrillers", "Binge-Worthy Series"],
    cast: ["Dante Mills", "Sofia Tran", "Yara Finch"],
    summary:
      "An investigator follows a string of sound-only clues through a city where every recording seems to know what happens next.",
    image: image("photo-1500534314209-a25ddb2bd429", 900, 1350),
    backdrop: image("photo-1500534314209-a25ddb2bd429", 1800, 1000),
    myList: true,
    progress: 68
  },
  {
    id: "the-last-harbor",
    title: "The Last Harbor",
    type: "Movie",
    year: 2026,
    rating: "PG-13",
    match: 91,
    runtime: "1h 54m",
    genres: ["Action", "Drama", "New"],
    rows: ["New Releases", "Popular Films"],
    cast: ["Noah Vale", "Iris Bennett", "Kenji Sato"],
    summary:
      "When a storm cuts off the coast, a retired rescue captain has one night to bring a ferry of missing passengers home.",
    image: image("photo-1500530855697-b586d89ba3ee", 900, 1350),
    backdrop: image("photo-1500530855697-b586d89ba3ee", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "deep-current",
    title: "Deep Current",
    type: "Series",
    year: 2025,
    rating: "TV-14",
    match: 88,
    runtime: "6 episodes",
    genres: ["Documentary", "Nature"],
    rows: ["Critically Watched", "Relaxed Viewing"],
    cast: ["Narrated by June Archer"],
    summary:
      "An immersive expedition follows marine scientists as they map a hidden current that may decide the future of coastal cities.",
    image: image("photo-1518837695005-2083093ee35b", 900, 1350),
    backdrop: image("photo-1518837695005-2083093ee35b", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "neon-saints",
    title: "Neon Saints",
    type: "Series",
    year: 2023,
    rating: "TV-MA",
    match: 90,
    runtime: "2 seasons",
    genres: ["Crime", "Drama"],
    rows: ["Crime Thrillers", "Binge-Worthy Series"],
    cast: ["Nico Ward", "Priya Shah", "Cam Ellis"],
    summary:
      "A downtown paramedic crew moonlights as fixers, saving lives by day and untangling dangerous debts after midnight.",
    image: image("photo-1493246507139-91e8fad9978e", 900, 1350),
    backdrop: image("photo-1493246507139-91e8fad9978e", 1800, 1000),
    myList: true,
    progress: 12
  },
  {
    id: "table-for-two",
    title: "Table for Two",
    type: "Movie",
    year: 2025,
    rating: "PG",
    match: 86,
    runtime: "1h 42m",
    genres: ["Comedy", "Romance"],
    rows: ["Easy Watching", "Popular Films"],
    cast: ["Lena Moore", "Oscar Hill", "Faye Knox"],
    summary:
      "A reservation mix-up pairs a meticulous critic with a chef who refuses to follow the menu, turning one bad dinner into a public dare.",
    image: image("photo-1492684223066-81342ee5ff30", 900, 1350),
    backdrop: image("photo-1492684223066-81342ee5ff30", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "orbit-house",
    title: "Orbit House",
    type: "Series",
    year: 2026,
    rating: "TV-PG",
    match: 94,
    runtime: "10 episodes",
    genres: ["Sci-Fi", "Comedy", "New"],
    rows: ["New Releases", "Sci-Fi Worlds", "Easy Watching"],
    cast: ["Jules Ahn", "Marcus Pike", "Nell Ortiz"],
    summary:
      "Roommates in the solar system's cheapest orbital apartment keep accidentally becoming the only people who can save Earth.",
    image: image("photo-1446776811953-b23d57bd21aa", 900, 1350),
    backdrop: image("photo-1446776811953-b23d57bd21aa", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "wild-card",
    title: "Wild Card",
    type: "Movie",
    year: 2024,
    rating: "R",
    match: 89,
    runtime: "1h 57m",
    genres: ["Action", "Crime"],
    rows: ["Trending Now", "Crime Thrillers"],
    cast: ["Reed Lawson", "Kim Vale", "Aya Brooks"],
    summary:
      "A casino courier with perfect recall takes one wrong envelope and becomes the only person who can expose a rigged empire.",
    image: image("photo-1511512578047-dfb367046420", 900, 1350),
    backdrop: image("photo-1511512578047-dfb367046420", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "the-long-shot",
    title: "The Long Shot",
    type: "Movie",
    year: 2022,
    rating: "PG-13",
    match: 84,
    runtime: "2h 14m",
    genres: ["Sports", "Drama"],
    rows: ["Award Season", "Popular Films"],
    cast: ["Tessa Bloom", "Amir Cole", "Graham Lee"],
    summary:
      "A former champion rebuilds a neighborhood team from a closed gym, chasing one final season that nobody expects them to finish.",
    image: image("photo-1461896836934-ffe607ba8211", 900, 1350),
    backdrop: image("photo-1461896836934-ffe607ba8211", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "small-town-static",
    title: "Small Town Static",
    type: "Series",
    year: 2025,
    rating: "TV-14",
    match: 87,
    runtime: "9 episodes",
    genres: ["Mystery", "Drama"],
    rows: ["Binge-Worthy Series", "Critically Watched"],
    cast: ["Avery Stone", "Mina Fox", "Cole Rivers"],
    summary:
      "After a local radio host predicts a disappearance on air, old friendships become evidence and every caller has a secret.",
    image: image("photo-1448375240586-882707db888b", 900, 1350),
    backdrop: image("photo-1448375240586-882707db888b", 1800, 1000),
    myList: true,
    progress: 45
  },
  {
    id: "counterpoint",
    title: "Counterpoint",
    type: "Series",
    year: 2024,
    rating: "TV-PG",
    match: 82,
    runtime: "2 seasons",
    genres: ["Music", "Drama"],
    rows: ["Critically Watched", "Award Season"],
    cast: ["Sasha Bloom", "Idris Lane", "Rene Ward"],
    summary:
      "At a conservatory where every seat is contested, a gifted pianist risks her scholarship to rewrite the rules of the competition.",
    image: image("photo-1493225457124-a3eb161ffa5f", 900, 1350),
    backdrop: image("photo-1493225457124-a3eb161ffa5f", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "blue-hour",
    title: "Blue Hour",
    type: "Movie",
    year: 2026,
    rating: "PG-13",
    match: 92,
    runtime: "1h 48m",
    genres: ["Drama", "New"],
    rows: ["New Releases", "Award Season"],
    cast: ["Ivy Grant", "Samir Keene", "Hana West"],
    summary:
      "A photographer returns home for one final assignment and captures the family history everyone else tried to crop out.",
    image: image("photo-1490730141103-6cac27aaab94", 900, 1350),
    backdrop: image("photo-1490730141103-6cac27aaab94", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "signal-hill",
    title: "Signal Hill",
    type: "Series",
    year: 2025,
    rating: "TV-14",
    match: 85,
    runtime: "7 episodes",
    genres: ["Mystery", "Sci-Fi"],
    rows: ["Sci-Fi Worlds", "Binge-Worthy Series"],
    cast: ["Leo Marsh", "Clara Yu", "Ben Sable"],
    summary:
      "A group of students tracking meteor showers finds a transmitter buried under campus, broadcasting their futures in fragments.",
    image: image("photo-1500534623283-312aade485b7", 900, 1350),
    backdrop: image("photo-1500534623283-312aade485b7", 1800, 1000),
    myList: true,
    progress: 73
  },
  {
    id: "bright-kitchen",
    title: "Bright Kitchen",
    type: "Series",
    year: 2026,
    rating: "TV-G",
    match: 80,
    runtime: "12 episodes",
    genres: ["Food", "Family", "New"],
    rows: ["New Releases", "Relaxed Viewing", "Easy Watching"],
    cast: ["Milo Hart", "Ana Beck", "Ruth Park"],
    summary:
      "Three generations turn a failing diner into the neighborhood's busiest room, one family recipe and one argument at a time.",
    image: image("photo-1556911220-bff31c812dba", 900, 1350),
    backdrop: image("photo-1556911220-bff31c812dba", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "line-of-fire",
    title: "Line of Fire",
    type: "Movie",
    year: 2023,
    rating: "R",
    match: 83,
    runtime: "2h 02m",
    genres: ["Action", "Thriller"],
    rows: ["Trending Now", "Crime Thrillers"],
    cast: ["Grant Wolfe", "Mila Shaw", "Deon Price"],
    summary:
      "An evacuation marshal must cross a burning industrial zone with a witness who knows why the blaze started.",
    image: image("photo-1519074069444-1ba4fff66d16", 900, 1350),
    backdrop: image("photo-1519074069444-1ba4fff66d16", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "paper-moons",
    title: "Paper Moons",
    type: "Movie",
    year: 2024,
    rating: "PG",
    match: 81,
    runtime: "1h 39m",
    genres: ["Family", "Adventure"],
    rows: ["Easy Watching", "Relaxed Viewing"],
    cast: ["Nora Finch", "Wes Gray", "Lily Chen"],
    summary:
      "A reluctant big sister and a runaway inventor follow a map of handmade moons through the summer their town forgot to celebrate.",
    image: image("photo-1500534314209-a25ddb2bd429", 900, 1350),
    backdrop: image("photo-1500534314209-a25ddb2bd429", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    type: "Series",
    year: 2025,
    rating: "TV-MA",
    match: 88,
    runtime: "6 episodes",
    genres: ["Legal", "Drama"],
    rows: ["Binge-Worthy Series", "Critically Watched"],
    cast: ["Eden Cross", "Mason Vale", "Lara Pierce"],
    summary:
      "A public defender takes on a finance conspiracy that begins in a spreadsheet and ends inside the highest court in the country.",
    image: image("photo-1521791055366-0d553872125f", 900, 1350),
    backdrop: image("photo-1521791055366-0d553872125f", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "after-the-rain",
    title: "After the Rain",
    type: "Movie",
    year: 2021,
    rating: "PG-13",
    match: 79,
    runtime: "1h 51m",
    genres: ["Romance", "Drama"],
    rows: ["Award Season", "Relaxed Viewing"],
    cast: ["Pia James", "Rowan Knox", "Emi Dale"],
    summary:
      "Years after a vanished letter ended their first love, two architects rebuild the theater where they last saw each other.",
    image: image("photo-1506744038136-46273834b3fb", 900, 1350),
    backdrop: image("photo-1506744038136-46273834b3fb", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "peak-hour",
    title: "Peak Hour",
    type: "Series",
    year: 2023,
    rating: "TV-PG",
    match: 77,
    runtime: "4 seasons",
    genres: ["Reality", "Travel"],
    rows: ["Relaxed Viewing", "Easy Watching"],
    cast: ["Hosted by Tess Alder"],
    summary:
      "Designers, chefs, and guides compete to create a perfect 24-hour trip in cities most travelers pass through too quickly.",
    image: image("photo-1501785888041-af3ef285b470", 900, 1350),
    backdrop: image("photo-1501785888041-af3ef285b470", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "archive-77",
    title: "Archive 77",
    type: "Series",
    year: 2026,
    rating: "TV-14",
    match: 91,
    runtime: "8 episodes",
    genres: ["Mystery", "New", "Thriller"],
    rows: ["New Releases", "Trending Now", "Binge-Worthy Series"],
    cast: ["Drew Hale", "Maren Yi", "Colin Shaw"],
    summary:
      "A museum archivist restoring damaged footage realizes every reel is a confession, and the final tape is still being recorded.",
    image: image("photo-1485846234645-a62644f84728", 900, 1350),
    backdrop: image("photo-1485846234645-a62644f84728", 1800, 1000),
    myList: true,
    progress: 25
  },
  {
    id: "green-room",
    title: "Green Room",
    type: "Movie",
    year: 2024,
    rating: "PG-13",
    match: 78,
    runtime: "1h 44m",
    genres: ["Comedy", "Music"],
    rows: ["Easy Watching", "Popular Films"],
    cast: ["Eli Hart", "Morgan Blue", "Rae Milton"],
    summary:
      "A touring band gets locked inside the wrong venue and has six hours to fake a benefit concert for a town that knows every lyric.",
    image: image("photo-1514525253161-7a46d19cd819", 900, 1350),
    backdrop: image("photo-1514525253161-7a46d19cd819", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "black-map",
    title: "Black Map",
    type: "Movie",
    year: 2025,
    rating: "R",
    match: 87,
    runtime: "2h 11m",
    genres: ["Thriller", "Action"],
    rows: ["Crime Thrillers", "Popular Films"],
    cast: ["Cass Noor", "Victor Lane", "Amelie North"],
    summary:
      "A courier in possession of an unmarked route learns that the shortest path across the city is also the deadliest.",
    image: image("photo-1518709268805-4e9042af2176", 900, 1350),
    backdrop: image("photo-1518709268805-4e9042af2176", 1800, 1000),
    myList: false,
    progress: 0
  },
  {
    id: "full-circle",
    title: "Full Circle",
    type: "Series",
    year: 2022,
    rating: "TV-G",
    match: 76,
    runtime: "5 seasons",
    genres: ["Family", "Comedy"],
    rows: ["Easy Watching", "Relaxed Viewing"],
    cast: ["Mia Brooks", "Henry Dale", "Sloane Kim"],
    summary:
      "A bicycle shop becomes the unlikely center of a neighborhood where every repair comes with a story and every story needs a ride.",
    image: image("photo-1507525428034-b723cf961d3e", 900, 1350),
    backdrop: image("photo-1507525428034-b723cf961d3e", 1800, 1000),
    myList: false,
    progress: 0
  }
];

const defaultRows = [
  "Continue Watching",
  "Trending Now",
  "New Releases",
  "Crime Thrillers",
  "Sci-Fi Worlds",
  "Award Season",
  "Easy Watching",
  "Relaxed Viewing"
];

const genres = [
  "All",
  "Movies",
  "Series",
  "New",
  "My List",
  "Thriller",
  "Sci-Fi",
  "Crime",
  "Drama",
  "Comedy",
  "Family",
  "Documentary"
];

const state = {
  query: "",
  filter: "All",
  sort: "featured",
  hero: titles.find((title) => title.hero) || titles[0],
  preview: null
};

const elements = {
  topbar: document.querySelector(".topbar"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  genrePills: document.querySelector("#genrePills"),
  rails: document.querySelector("#rails"),
  resultSummary: document.querySelector("#resultSummary"),
  heroBackdrop: document.querySelector("#heroBackdrop"),
  heroTitle: document.querySelector("#heroTitle"),
  heroMeta: document.querySelector("#heroMeta"),
  heroCopy: document.querySelector("#heroCopy"),
  heroRating: document.querySelector("#heroRating"),
  heroMore: document.querySelector("#heroMore"),
  heroPlay: document.querySelector("#heroPlay"),
  previewScrim: document.querySelector("#previewScrim"),
  previewDrawer: document.querySelector("#previewDrawer"),
  previewMedia: document.querySelector("#previewMedia"),
  previewLabel: document.querySelector("#previewLabel"),
  previewTitle: document.querySelector("#previewTitle"),
  previewMeta: document.querySelector("#previewMeta"),
  previewDescription: document.querySelector("#previewDescription"),
  previewCast: document.querySelector("#previewCast"),
  previewGenres: document.querySelector("#previewGenres"),
  previewRuntime: document.querySelector("#previewRuntime"),
  closePreview: document.querySelector("#closePreview"),
  myListButton: document.querySelector("#myListButton")
};

function makeMeta(title) {
  return `
    <span class="match">${title.match}% Match</span>
    <span>${title.year}</span>
    <span class="age-rating">${title.rating}</span>
    <span>${title.runtime}</span>
    <span>${title.type}</span>
  `;
}

function setHero(title) {
  state.hero = title;
  elements.heroBackdrop.style.backgroundImage = `url("${title.backdrop}")`;
  elements.heroTitle.textContent = title.title;
  elements.heroMeta.innerHTML = makeMeta(title);
  elements.heroCopy.textContent = title.summary;
  elements.heroRating.textContent = title.rating;
}

function titleMatches(title) {
  const query = state.query.trim().toLowerCase();
  const haystack = [
    title.title,
    title.type,
    title.year,
    title.rating,
    title.runtime,
    title.summary,
    ...title.genres,
    ...title.cast
  ]
    .join(" ")
    .toLowerCase();

  const matchesQuery = !query || haystack.includes(query);
  const matchesFilter =
    state.filter === "All" ||
    (state.filter === "Movies" && title.type === "Movie") ||
    title.type === state.filter ||
    title.genres.includes(state.filter) ||
    (state.filter === "New" && title.genres.includes("New")) ||
    (state.filter === "My List" && title.myList);

  return matchesQuery && matchesFilter;
}

function sortTitles(list) {
  const copy = [...list];

  if (state.sort === "match") {
    return copy.sort((a, b) => b.match - a.match);
  }

  if (state.sort === "newest") {
    return copy.sort((a, b) => b.year - a.year || b.match - a.match);
  }

  if (state.sort === "az") {
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }

  return copy.sort((a, b) => Number(b.hero) - Number(a.hero) || b.match - a.match);
}

function titlesForRow(rowName, filtered) {
  if (rowName === "Continue Watching") {
    return filtered.filter((title) => title.progress > 0);
  }

  return filtered.filter((title) => title.rows.includes(rowName));
}

function createPills() {
  elements.genrePills.innerHTML = genres
    .map(
      (genre) => `
        <button class="genre-pill${genre === state.filter ? " active" : ""}" type="button" data-filter="${genre}">
          ${genre}
        </button>
      `
    )
    .join("");
}

function createTitleCard(title, index, isLandscape) {
  const hue = (index * 47 + title.title.length * 11) % 360;
  const fallback = `linear-gradient(135deg, hsl(${hue} 62% 24%), hsl(${(hue + 42) % 360} 54% 13%))`;
  const progress = title.progress
    ? `<div class="progress" aria-label="${title.progress}% watched"><span style="width: ${title.progress}%"></span></div>`
    : "";
  const rank = index < 10 ? `<span class="card-rank">${index + 1}</span>` : "";
  const classes = `title-card ${isLandscape ? "wide-card" : "poster-card"}`;

  return `
    <button class="${classes}" style="--fallback: ${fallback}" type="button" data-title-id="${title.id}" aria-label="Preview ${title.title}">
      <img src="${isLandscape ? title.backdrop : title.image}" alt="" loading="lazy" onerror="this.remove()" />
      ${rank}
      <span class="card-body">
        <span class="card-title">${title.title}</span>
        <span class="card-meta">
          <span class="match">${title.match}%</span>
          <span>${title.year}</span>
          <span>${title.type}</span>
        </span>
      </span>
      ${progress}
    </button>
  `;
}

function createRail(rowName, rowTitles, isLandscape = false) {
  const cards = rowTitles.map((title, index) => createTitleCard(title, index, isLandscape)).join("");
  const id = rowName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return `
    <section class="rail" aria-labelledby="${id}">
      <div class="rail-header">
        <h3 id="${id}">${rowName}</h3>
        <span class="rail-count">${rowTitles.length} titles</span>
      </div>
      <div class="rail-track-wrap">
        <button class="scroll-button left" type="button" aria-label="Scroll ${rowName} left" data-scroll="-1" disabled>&lt;</button>
        <div class="rail-track${isLandscape ? " landscape" : ""}" tabindex="0">
          ${cards}
        </div>
        <button class="scroll-button right" type="button" aria-label="Scroll ${rowName} right" data-scroll="1">&gt;</button>
      </div>
    </section>
  `;
}

function updateScrollButtonsForWrap(wrap) {
  const track = wrap.querySelector(".rail-track");
  const leftButton = wrap.querySelector('[data-scroll="-1"]');
  const rightButton = wrap.querySelector('[data-scroll="1"]');
  const trackStyles = window.getComputedStyle(track);
  const startPadding = Number.parseFloat(trackStyles.paddingLeft) || 0;
  const endPadding = Number.parseFloat(trackStyles.paddingRight) || 0;
  const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);

  leftButton.disabled = track.scrollLeft <= startPadding + 2;
  rightButton.disabled = maxScroll <= 2 || track.scrollLeft >= maxScroll - endPadding - 2;
}

function bindRailScrolling() {
  document.querySelectorAll(".rail-track-wrap").forEach((wrap) => {
    const track = wrap.querySelector(".rail-track");
    updateScrollButtonsForWrap(wrap);
    track.addEventListener("scroll", () => updateScrollButtonsForWrap(wrap), { passive: true });
  });
}

function createEmptyState() {
  return `
    <section class="empty-state" aria-live="polite">
      <h3>No matches found</h3>
      <p>Try another title, cast member, genre, or clear the active filter.</p>
    </section>
  `;
}

function updateSummary(count, isFocusedBrowse) {
  if (count === 0) {
    elements.resultSummary.textContent = "No matches in this library.";
    return;
  }

  if (isFocusedBrowse) {
    const label = state.query ? `"${state.query}"` : state.filter;
    elements.resultSummary.textContent = `${count} titles match ${label}.`;
    return;
  }

  elements.resultSummary.textContent = "Handpicked rows for tonight.";
}

function renderRails() {
  elements.rails.setAttribute("aria-busy", "true");
  const filtered = sortTitles(titles.filter(titleMatches));
  const isFocusedBrowse = state.query.trim() || state.filter !== "All" || state.sort !== "featured";

  updateSummary(filtered.length, Boolean(isFocusedBrowse));

  if (!filtered.length) {
    elements.rails.innerHTML = createEmptyState();
    elements.rails.setAttribute("aria-busy", "false");
    return;
  }

  if (isFocusedBrowse) {
    elements.rails.innerHTML = createRail("Browse Results", filtered, false);
    bindRailScrolling();
    elements.rails.setAttribute("aria-busy", "false");
    return;
  }

  const rows = defaultRows
    .map((rowName) => {
      const rowTitles = titlesForRow(rowName, filtered);
      return rowTitles.length ? createRail(rowName, rowTitles, rowName === "Continue Watching") : "";
    })
    .join("");

  elements.rails.innerHTML = rows;
  bindRailScrolling();
  elements.rails.setAttribute("aria-busy", "false");
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });
  createPills();
  renderRails();
}

function findTitle(id) {
  return titles.find((title) => title.id === id);
}

function openPreview(title) {
  state.preview = title;
  elements.previewMedia.style.backgroundImage = `url("${title.backdrop}")`;
  elements.previewLabel.textContent = title.type === "Series" ? "Series Preview" : "Movie Preview";
  elements.previewTitle.textContent = title.title;
  elements.previewMeta.innerHTML = makeMeta(title);
  elements.previewDescription.textContent = title.summary;
  elements.previewCast.textContent = title.cast.join(", ");
  elements.previewGenres.textContent = title.genres.filter((genre) => genre !== "New").join(", ");
  elements.previewRuntime.textContent = title.runtime;
  elements.myListButton.textContent = title.myList ? "-" : "+";
  elements.myListButton.setAttribute("aria-label", title.myList ? "Remove from my list" : "Add to my list");
  elements.previewScrim.hidden = false;
  elements.previewDrawer.hidden = false;
  document.body.style.overflow = "hidden";
  elements.closePreview.focus();
}

function closePreview() {
  elements.previewScrim.hidden = true;
  elements.previewDrawer.hidden = true;
  document.body.style.overflow = "";
  state.preview = null;
}

function toggleMyList() {
  if (!state.preview) {
    return;
  }

  state.preview.myList = !state.preview.myList;
  elements.myListButton.textContent = state.preview.myList ? "-" : "+";
  elements.myListButton.setAttribute("aria-label", state.preview.myList ? "Remove from my list" : "Add to my list");
  renderRails();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderRails();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderRails();
  });

  document.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      setFilter(filterButton.dataset.filter);
      return;
    }

    const titleCard = event.target.closest("[data-title-id]");
    if (titleCard) {
      const title = findTitle(titleCard.dataset.titleId);
      if (title) {
        setHero(title);
        openPreview(title);
      }
      return;
    }

    const scrollButton = event.target.closest("[data-scroll]");
    if (scrollButton) {
      const track = scrollButton.parentElement.querySelector(".rail-track");
      const direction = Number(scrollButton.dataset.scroll);
      track.scrollBy({ left: direction * track.clientWidth * 0.86, behavior: "smooth" });
      window.setTimeout(() => updateScrollButtonsForWrap(scrollButton.parentElement), 220);
    }
  });

  document.addEventListener("mouseover", (event) => {
    const titleCard = event.target.closest("[data-title-id]");
    if (titleCard) {
      const title = findTitle(titleCard.dataset.titleId);
      if (title) {
        setHero(title);
      }
    }
  });

  elements.heroMore.addEventListener("click", () => openPreview(state.hero));
  elements.heroPlay.addEventListener("click", () => openPreview(state.hero));
  elements.closePreview.addEventListener("click", closePreview);
  elements.previewScrim.addEventListener("click", closePreview);
  elements.myListButton.addEventListener("click", toggleMyList);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.previewDrawer.hidden) {
      closePreview();
    }
  });

  window.addEventListener("scroll", () => {
    elements.topbar.classList.toggle("scrolled", window.scrollY > 24);
  });
}

function init() {
  createPills();
  setHero(state.hero);
  renderRails();
  bindEvents();
}

init();
