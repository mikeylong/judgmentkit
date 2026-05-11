import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createActivityModelReview,
  createUiGenerationHandoff,
  reviewUiWorkflowCandidate,
} from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "examples/comparison/music");
const BRIEF_PATH = path.join(
  OUTPUT_DIR,
  "dinner-playlist-implementation-heavy.brief.txt",
);
const VERSION_A_PATH = path.join(OUTPUT_DIR, "version-a.html");
const VERSION_B_PATH = path.join(OUTPUT_DIR, "version-b.html");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const SCORECARD_PATH = path.join(OUTPUT_DIR, "facilitator-scorecard.md");

const COMPARISON_ID = "dinner-playlist-standalone-v1";
const TASK_PROMPT =
  "Build a 10-song dinner playlist that starts mellow, lifts in the middle, avoids disliked artists and explicit tracks, and leaves a sequence note.";
const PLAYLIST_ID = "DINNER-10";
const METRICS = [
  "task success",
  "time to playable playlist",
  "constraint misses",
  "implementation leakage noticed",
  "host confidence",
  "required rework before usable",
  "participant preference with rationale",
];

const SOURCE_BRIEF = `
A host/listener is curating a dinner playlist for friends on Friday night. The request says to build the music app from the track_library data model, expose every track table field, show JSON schema validation errors, show prompt template version, show recommendation tool call results, include resource id and API endpoint status, and make it CRUD. The activity is deciding which songs belong in a 10-song dinner playlist, how they should be ordered, and whether any song violates guest preference, explicit-content, genre-balance, or dinner-mood constraints. The outcome is a playable 10-song playlist with a mellow opener, a warmer middle, a closing track, no known guest or explicit-content conflicts, and a short sequence note the host would be willing to play or share. Use domain vocabulary such as playlist, track, artist, guest preference, dinner mood, energy flow, mellow opener, warm middle, closing track, genre balance, explicit track, disliked artist, save playlist, share playlist, and sequence note.
`.trim();

const IMPLEMENTATION_TERMS = [
  "data model",
  "track table field",
  "JSON schema",
  "prompt template",
  "tool call",
  "resource id",
  "API endpoint",
  "CRUD",
];

const REVIEW_PACKET_TERMS = [
  "ready_for_review",
  "activity_model",
  "interaction_contract",
  "review_status",
  "guardrails",
  "JudgmentKit",
];

const GUEST_NOTES = [
  "Maya likes warm soul and has asked to avoid The Grey Glass.",
  "Jon wants a mellow opener and no explicit tracks during dinner.",
  "Priya likes light electronic textures when they stay conversational.",
  "Keep indie, soul, jazz, and electronic represented without letting one genre dominate.",
];

const TRACKS = [
  {
    id: "TRK-101",
    title: "Lantern Hour",
    artist: "Mira Vale",
    genre: "jazz",
    energy: 2,
    role: "mellow opener",
    note: "Soft piano and brushed drums for the first pour.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-102",
    title: "Table Glow",
    artist: "The Knoll Tapes",
    genre: "soul",
    energy: 3,
    role: "early warmth",
    note: "Warm vocal line without pulling focus from conversation.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-103",
    title: "Window Seat",
    artist: "Rafi Lane",
    genre: "indie",
    energy: 3,
    role: "settled groove",
    note: "Gentle guitar rhythm that keeps the room relaxed.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-104",
    title: "Apricot Static",
    artist: "Northline",
    genre: "electronic",
    energy: 4,
    role: "warm middle",
    note: "Light synth pulse for the first lift in the sequence.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-105",
    title: "Second Serving",
    artist: "Lena Moss",
    genre: "soul",
    energy: 5,
    role: "warm middle",
    note: "Best midpoint lift; upbeat but still dinner-friendly.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-106",
    title: "Kitchen Lights",
    artist: "Harbor Trio",
    genre: "jazz",
    energy: 4,
    role: "middle reset",
    note: "Keeps the lift while giving the room more space.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-107",
    title: "Low Tide Signal",
    artist: "Sol Arras",
    genre: "electronic",
    energy: 5,
    role: "late lift",
    note: "A clean pulse for the highest-energy stretch.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-108",
    title: "Porch Current",
    artist: "Ever Vale",
    genre: "indie",
    energy: 4,
    role: "soft landing",
    note: "Returns to guitars after the electronic lift.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-109",
    title: "Afterglow Maps",
    artist: "Inez House",
    genre: "soul",
    energy: 3,
    role: "wind down",
    note: "A warm descent before the closing track.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-110",
    title: "Nightcap Sketch",
    artist: "Moir & Co.",
    genre: "jazz",
    energy: 2,
    role: "closing track",
    note: "Quiet closer for dessert and lingering conversation.",
    explicit: false,
    dislikedArtist: false,
  },
  {
    id: "TRK-111",
    title: "Midnight Spill",
    artist: "DJ Cinder",
    genre: "electronic",
    energy: 6,
    role: "trap",
    note: "Good tempo, but the lyrics violate the dinner rule.",
    explicit: true,
    dislikedArtist: false,
  },
  {
    id: "TRK-112",
    title: "Velvet Return",
    artist: "The Grey Glass",
    genre: "indie",
    energy: 4,
    role: "trap",
    note: "Close mood fit, but this artist is on Maya's avoid list.",
    explicit: false,
    dislikedArtist: true,
  },
];

const PLAYLIST_TRACK_IDS = [
  "TRK-101",
  "TRK-102",
  "TRK-103",
  "TRK-104",
  "TRK-105",
  "TRK-106",
  "TRK-107",
  "TRK-108",
  "TRK-109",
  "TRK-110",
];

function readBrief() {
  return fs.readFileSync(BRIEF_PATH, "utf8").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeScriptJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function renderList(values) {
  return values.map((value) => `<li>${escapeHtml(value)}</li>`).join("");
}

function trackById(id) {
  const track = TRACKS.find((item) => item.id === id);

  if (!track) {
    throw new Error(`Unknown track id: ${id}`);
  }

  return track;
}

function trackConflict(track) {
  if (track.explicit) {
    return "Explicit track";
  }

  if (track.dislikedArtist) {
    return "Disliked artist";
  }

  return "Fits brief";
}

function buildUiWorkflowCandidate() {
  return {
    workflow: {
      surface_name: "Dinner playlist builder",
      steps: [
        "Review the dinner brief",
        "Compare suggested tracks",
        "Shape the energy flow",
        "Resolve playlist conflicts",
        "Save and share the playlist",
      ],
      primary_actions: [
        "Add to playlist",
        "Move earlier",
        "Move later",
        "Remove track",
        "Mark as conflict",
        "Save playlist",
        "Share playlist",
      ],
      decision_points: [
        "Decide whether each suggested track fits guest preferences, dinner mood, explicit-content rules, and genre balance.",
        "Decide the final order so the playlist starts mellow, builds warmth, and ends intentionally.",
      ],
      completion_state:
        "A playable 10-song dinner playlist is saved with no known conflicts and a short sequence note.",
    },
    primary_ui: {
      sections: [
        "Dinner brief",
        "Guest preferences",
        "Suggested tracks",
        "Playlist sequence",
        "Conflict checks",
        "Sequence note",
      ],
      controls: [
        "Add to playlist",
        "Move earlier",
        "Move later",
        "Remove track",
        "Conflict check",
        "Save playlist",
        "Share playlist",
      ],
      user_facing_terms: [
        "playlist",
        "track",
        "artist",
        "guest preference",
        "dinner mood",
        "energy flow",
        "mellow opener",
        "warm middle",
        "closing track",
        "genre balance",
        "explicit track",
        "disliked artist",
        "sequence note",
      ],
    },
    handoff: {
      next_owner: "host",
      reason:
        "The selected tracks fit the dinner mood, avoid known guest and content conflicts, and follow the intended energy flow.",
      next_action: "Save and share the dinner playlist.",
    },
    diagnostics: {
      implementation_terms: IMPLEMENTATION_TERMS,
      reveal_contexts: ["setup", "debugging", "auditing", "integration"],
    },
  };
}

function buildHandoff(brief) {
  const activityReview = createActivityModelReview(brief);
  const workflowReview = reviewUiWorkflowCandidate(brief, buildUiWorkflowCandidate());
  const handoff = createUiGenerationHandoff(workflowReview);

  return {
    activityReview,
    workflowReview,
    handoff,
  };
}

function buildSharedHeader() {
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">Dinner music</p>
        <h1>Dinner Playlist Builder</h1>
      </div>
      <p class="task-prompt" data-study-task>${escapeHtml(TASK_PROMPT)}</p>
    </header>
  `;
}

function buildBaselinePrimarySurface() {
  return `
    <main class="app-shell baseline-shell" data-primary-surface>
      ${buildSharedHeader()}

      <section class="toolbar" aria-label="Record actions">
        <button type="button">Create</button>
        <button type="button">Read</button>
        <button type="button">Update</button>
        <button type="button">Delete</button>
        <button type="button">Refresh JSON schema</button>
        <button type="button">Rerun prompt template</button>
      </section>

      <section class="record-grid">
        <div class="record-table">
          <div class="section-heading">
            <p class="eyebrow">Admin record</p>
            <h2>track_library data model</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>track table field</th>
                <th>value</th>
                <th>JSON schema</th>
              </tr>
            </thead>
            <tbody>
              ${TRACKS.map(
                (track) => `
                  <tr>
                    <td>track_library.${escapeHtml(track.id)}</td>
                    <td>${escapeHtml(track.title)} / ${escapeHtml(track.artist)} / energy_${escapeHtml(track.energy)}</td>
                    <td>${track.explicit || track.dislikedArtist ? "warning" : "valid"}</td>
                  </tr>
                `,
              ).join("")}
              <tr>
                <td>track_library.prompt_template</td>
                <td>dinner_playlist_v07</td>
                <td>valid</td>
              </tr>
              <tr>
                <td>track_library.tool_call_result</td>
                <td>recommendation.rank.pending</td>
                <td>needs manual CRUD update</td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside class="debug-panel">
          <h2>Record controls</h2>
          <dl>
            <div>
              <dt>resource id</dt>
              <dd>music_playlist_2917</dd>
            </div>
            <div>
              <dt>API endpoint</dt>
              <dd>/v1/music/track-library</dd>
            </div>
            <div>
              <dt>CRUD status</dt>
              <dd>Unsaved update</dd>
            </div>
          </dl>
          <button type="button" class="primary-action">Save CRUD update</button>
        </aside>
      </section>

      <section class="record-grid">
        <div class="debug-panel">
          <h2>Prompt template</h2>
          <p>dinner_playlist_v07 sorts the track table field values before the CRUD save action.</p>
        </div>
        <div class="debug-panel">
          <h2>Tool call result</h2>
          <p>recommendation.rank.pending requires another tool call before the playlist data model can be saved.</p>
        </div>
      </section>
    </main>
  `;
}

function buildWorkflowSteps(steps) {
  return steps
    .map(
      (step, index) => `
        <li${index === 0 ? ' class="is-current"' : ""}>
          <span>${index + 1}</span>
          ${escapeHtml(step)}
        </li>
      `,
    )
    .join("");
}

function buildSuggestedTracks() {
  return TRACKS.map(
    (track) => `
      <div class="track-row${track.explicit || track.dislikedArtist ? " has-conflict" : ""}">
        <div class="album-mark" aria-hidden="true">${escapeHtml(track.genre.slice(0, 2).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(track.title)}</strong>
          <span>${escapeHtml(track.artist)} · ${escapeHtml(track.genre)} · energy ${escapeHtml(track.energy)}</span>
          <small>${escapeHtml(track.note)}</small>
        </div>
        <div class="track-actions">
          <span>${escapeHtml(trackConflict(track))}</span>
          <button type="button">${track.explicit || track.dislikedArtist ? "Mark as conflict" : "Add to playlist"}</button>
        </div>
      </div>
    `,
  ).join("");
}

function buildPlaylistSequence() {
  return PLAYLIST_TRACK_IDS.map((id, index) => {
    const track = trackById(id);

    return `
      <li>
        <span class="sequence-number">${index + 1}</span>
        <div>
          <strong>${escapeHtml(track.title)}</strong>
          <span>${escapeHtml(track.artist)} · ${escapeHtml(track.role)} · energy ${escapeHtml(track.energy)}</span>
        </div>
        <div class="move-actions">
          <button type="button">Move earlier</button>
          <button type="button">Move later</button>
          <button type="button">Remove track</button>
        </div>
      </li>
    `;
  }).join("");
}

function buildGenreBalance() {
  const counts = new Map();

  for (const id of PLAYLIST_TRACK_IDS) {
    const track = trackById(id);
    counts.set(track.genre, (counts.get(track.genre) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([genre, count]) => `<li>${escapeHtml(genre)}: ${escapeHtml(count)} tracks</li>`)
    .join("");
}

function buildGuidedPrimarySurface(handoff) {
  return `
    <main class="app-shell guided-shell" data-primary-surface>
      ${buildSharedHeader()}

      <section class="workflow-strip" aria-label="Playlist workflow">
        <div class="section-heading">
          <p class="eyebrow">Hosting flow</p>
          <h2>${escapeHtml(handoff.workflow.surface_name)}</h2>
        </div>
        <ol>${buildWorkflowSteps(handoff.workflow.steps)}</ol>
      </section>

      <section class="brief-panel">
        <div>
          <p class="eyebrow">Dinner brief</p>
          <h2>${escapeHtml(PLAYLIST_ID)}</h2>
          <p>Friday dinner with friends. Start with a mellow opener, build into a warm middle, and close softly enough for dessert and conversation.</p>
        </div>
        <div>
          <p class="eyebrow">Guest preferences</p>
          <ul>${renderList(GUEST_NOTES)}</ul>
        </div>
      </section>

      <section class="workspace-grid">
        <aside class="suggested-panel" aria-label="Suggested tracks">
          <div class="section-heading">
            <p class="eyebrow">Suggested tracks</p>
            <h2>Compare fit</h2>
          </div>
          ${buildSuggestedTracks()}
        </aside>

        <div class="playlist-panel">
          <section>
            <div class="section-heading">
              <p class="eyebrow">Playlist sequence</p>
              <h2>10 tracks ready to play</h2>
            </div>
            <ol class="playlist-sequence">${buildPlaylistSequence()}</ol>
          </section>

          <section class="checks-panel">
            <div>
              <h2>Conflict checks</h2>
              <ul class="checklist">
                <li>No explicit track in the saved playlist.</li>
                <li>No disliked artist in the saved playlist.</li>
                <li>Mellow opener, warm middle, and closing track are present.</li>
              </ul>
            </div>
            <div>
              <h2>Genre balance</h2>
              <ul class="checklist">${buildGenreBalance()}</ul>
            </div>
          </section>

          <section class="sequence-note">
            <h2>Sequence note</h2>
            <label>
              Note for sharing
              <textarea rows="4">${escapeHtml(handoff.handoff.reason)}</textarea>
            </label>
            <div class="decision-actions">
              <button type="button" class="primary-action">Save playlist</button>
              <button type="button">Share playlist</button>
            </div>
          </section>
        </div>
      </section>
    </main>
  `;
}

function buildStyles() {
  return `
    :root {
      color-scheme: light;
      --ink: #17232a;
      --muted: #627078;
      --line: #cbd6d1;
      --surface: #f5f7f2;
      --panel: #ffffff;
      --accent: #276b61;
      --accent-dark: #17483f;
      --warning: #8a3f31;
      --soft: #edf5f1;
      --warm: #fbf4e8;
      --note: #f2eff8;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: var(--ink);
      background: var(--surface);
    }

    button,
    select,
    textarea {
      font: inherit;
    }

    button,
    textarea {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--ink);
    }

    button {
      min-height: 40px;
      padding: 0 14px;
      font-weight: 650;
      cursor: pointer;
    }

    .primary-action {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }

    .app-shell {
      min-height: 100vh;
      padding: 28px;
    }

    .app-header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: start;
      padding-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }

    h1,
    h2,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 0;
      font-size: 2rem;
      line-height: 1.1;
    }

    h2 {
      margin-bottom: 12px;
      font-size: 1.1rem;
      line-height: 1.25;
    }

    .eyebrow,
    dt {
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 0.75rem;
      font-weight: 760;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .task-prompt {
      max-width: 430px;
      margin-bottom: 0;
      color: var(--muted);
      line-height: 1.45;
      text-align: right;
    }

    section,
    aside,
    .record-table,
    .debug-panel,
    .brief-panel,
    .playlist-panel {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    section,
    aside,
    .record-table,
    .debug-panel,
    .brief-panel {
      padding: 18px;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 22px 0;
      border-color: #d7b36f;
      background: var(--warm);
    }

    .record-grid,
    .workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      margin-top: 18px;
    }

    .workspace-grid {
      grid-template-columns: 430px minmax(0, 1fr);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.94rem;
    }

    th,
    td {
      padding: 13px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
    }

    dl,
    dd {
      margin: 0;
    }

    dl div + div {
      margin-top: 14px;
    }

    dd {
      font-weight: 650;
    }

    .debug-panel p {
      color: var(--warning);
      line-height: 1.45;
    }

    .workflow-strip {
      margin: 22px 0;
    }

    .workflow-strip ol {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .workflow-strip li {
      display: flex;
      gap: 10px;
      align-items: center;
      min-height: 58px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
    }

    .workflow-strip li span,
    .sequence-number {
      display: inline-grid;
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      place-items: center;
      border-radius: 50%;
      background: var(--soft);
      color: var(--accent-dark);
      font-weight: 760;
    }

    .workflow-strip li.is-current {
      border-color: var(--accent);
      background: var(--soft);
    }

    .brief-panel {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
      gap: 22px;
      background: var(--note);
    }

    .brief-panel p {
      margin-bottom: 0;
      line-height: 1.5;
    }

    .brief-panel ul {
      display: grid;
      gap: 8px;
      padding-left: 20px;
      margin: 0;
      line-height: 1.45;
    }

    .suggested-panel {
      align-self: start;
    }

    .track-row {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
      padding: 12px 0;
      border-top: 1px solid var(--line);
    }

    .track-row.has-conflict {
      background: #fff7f4;
    }

    .album-mark {
      display: grid;
      width: 44px;
      height: 44px;
      place-items: center;
      border-radius: 8px;
      background: linear-gradient(135deg, #ddece6, #f3e2c3);
      color: var(--accent-dark);
      font-size: 0.72rem;
      font-weight: 780;
    }

    .track-row strong,
    .track-row span,
    .track-row small,
    .playlist-sequence strong,
    .playlist-sequence span {
      display: block;
    }

    .track-row span,
    .track-row small,
    .playlist-sequence span {
      color: var(--muted);
      line-height: 1.35;
    }

    .track-row small {
      margin-top: 4px;
    }

    .track-actions {
      grid-column: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
    }

    .track-actions span {
      color: var(--warning);
      font-weight: 680;
    }

    .playlist-panel {
      display: grid;
      gap: 14px;
      padding: 0;
      border: 0;
      background: transparent;
    }

    .playlist-sequence {
      display: grid;
      gap: 8px;
      padding: 0;
      margin: 0;
      list-style: none;
    }

    .playlist-sequence li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid var(--line);
    }

    .move-actions,
    .decision-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .move-actions button {
      min-height: 34px;
      padding: 0 10px;
    }

    .checks-panel {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
    }

    .checklist {
      display: grid;
      gap: 10px;
      padding-left: 20px;
      margin-bottom: 0;
      line-height: 1.45;
    }

    .sequence-note {
      display: grid;
      gap: 12px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-weight: 650;
    }

    textarea {
      width: 100%;
      padding: 10px 12px;
      color: var(--ink);
    }

    @media (max-width: 900px) {
      .app-header,
      .record-grid,
      .workspace-grid,
      .brief-panel,
      .checks-panel {
        display: block;
      }

      .task-prompt {
        max-width: none;
        margin-top: 10px;
        text-align: left;
      }

      .debug-panel,
      .record-table,
      .suggested-panel,
      .workflow-strip,
      .playlist-panel,
      .brief-panel > div + div {
        margin-top: 14px;
      }

      .workflow-strip ol {
        grid-template-columns: 1fr;
      }

      .playlist-sequence li {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .move-actions {
        grid-column: 2;
        justify-content: flex-start;
      }
    }
  `;
}

function buildStandaloneHtml({ variantLabel, primarySurfaceHtml, metadata }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dinner Playlist Builder ${escapeHtml(variantLabel)}</title>
  <style>${buildStyles()}</style>
</head>
<body data-comparison-id="${COMPARISON_ID}" data-variant="${escapeHtml(
    variantLabel,
  )}">
  ${primarySurfaceHtml}
  <script type="application/json" id="comparison-metadata">${escapeScriptJson(
    metadata,
  )}</script>
</body>
</html>
`;
}

function writeText(filePath, value) {
  fs.writeFileSync(`${filePath}.tmp`, value);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function writeJson(filePath, value) {
  writeText(filePath, `${escapeScriptJson(value)}\n`);
}

function buildScorecardMarkdown() {
  return `# Dinner Playlist Comparison Scorecard

Use this worksheet to run a qualitative paired calibration for \`${COMPARISON_ID}\`.

## Setup

- Participant:
- Facilitator:
- Date:
- Order shown: AB / BA
- First app file:
- Second app file:
- Start time:
- End time:

Do not describe either app by its treatment. Present both as alternate generated music apps.

## Participant Prompt

${TASK_PROMPT}

Ask the participant to think aloud while they work. Stop the task when they say the playlist is ready to play or when 12 minutes have elapsed.

## Observation Notes

- Where did the participant start?
- Which tracks did they remove or keep?
- Did they notice the explicit track?
- Did they notice the disliked artist?
- Did they adjust or explain the energy flow?
- Which labels, controls, or terms distracted them?
- What cleanup would they need before using the app?

## Scorecard

| Metric | First app | Second app | Notes |
| --- | --- | --- | --- |
| Task success | 0 / 1 | 0 / 1 | Playable 10-song playlist with sequence note. |
| Time to playable playlist | minutes | minutes | Stop when participant says it is ready. |
| Constraint misses | count | count | Explicit, disliked artist, genre balance, energy flow. |
| Implementation leakage noticed | none / some / high | none / some / high | Record exact words or controls noticed. |
| Host confidence | 1-5 | 1-5 | Ask: would you play this at dinner? |
| Required rework before usable | none / light / heavy | none / light / heavy | Ask what they would change before using it. |
| Participant preference with rationale | first / second / tie | first / second / tie | Capture the reason in their words. |

## Post-Task Questions

1. Which app made it easier to decide what belonged in the playlist?
2. Which app made conflicts easier to catch?
3. Which app made the song order easier to explain?
4. Which words or controls felt like system machinery instead of music work?
5. Which app would you rather use for the dinner playlist, and why?

## Interpretation

Treat the JudgmentKit-guided app as a meaningful win only if reviewers show fewer constraint misses, less implementation leakage, lower required rework, and preference rationales centered on playlist sequence, conflict checks, and dinner-fit decisions rather than visual polish.
`;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  writeText(BRIEF_PATH, `${SOURCE_BRIEF}\n`);

  const brief = readBrief();
  const { activityReview, workflowReview, handoff } = buildHandoff(brief);

  const baselineMetadata = {
    comparison_id: COMPARISON_ID,
    variant: "A",
    treatment: "raw_brief_baseline",
    task_prompt: TASK_PROMPT,
    selected_playlist_id: PLAYLIST_ID,
    source_brief_file: path.relative(ROOT_DIR, BRIEF_PATH),
    visible_leakage_terms_expected: IMPLEMENTATION_TERMS,
  };
  const guidedMetadata = {
    comparison_id: COMPARISON_ID,
    variant: "B",
    treatment: "judgmentkit_handoff",
    task_prompt: TASK_PROMPT,
    selected_playlist_id: PLAYLIST_ID,
    source_brief_file: path.relative(ROOT_DIR, BRIEF_PATH),
    generation_source: {
      handoff_status: handoff.handoff_status,
      activity_review_status: activityReview.review_status,
      workflow_review_status: workflowReview.review_status,
      surface_name: handoff.workflow.surface_name,
    },
    terms_kept_out_of_primary_ui: [
      ...handoff.disclosure_reminders.terms_to_keep_out_of_primary_ui,
      ...REVIEW_PACKET_TERMS,
    ],
  };

  writeText(
    VERSION_A_PATH,
    buildStandaloneHtml({
      variantLabel: "A",
      primarySurfaceHtml: buildBaselinePrimarySurface(),
      metadata: baselineMetadata,
    }),
  );
  writeText(
    VERSION_B_PATH,
    buildStandaloneHtml({
      variantLabel: "B",
      primarySurfaceHtml: buildGuidedPrimarySurface(handoff),
      metadata: guidedMetadata,
    }),
  );
  writeJson(MANIFEST_PATH, {
    comparison_id: COMPARISON_ID,
    task_prompt: TASK_PROMPT,
    selected_playlist_id: PLAYLIST_ID,
    source_brief_file: path.relative(ROOT_DIR, BRIEF_PATH),
    scorecard_file: path.relative(ROOT_DIR, SCORECARD_PATH),
    randomized_order_required: true,
    variants: [
      {
        label: "Version A",
        file: path.relative(ROOT_DIR, VERSION_A_PATH),
        treatment: "raw_brief_baseline",
      },
      {
        label: "Version B",
        file: path.relative(ROOT_DIR, VERSION_B_PATH),
        treatment: "judgmentkit_handoff",
      },
    ],
    metrics: METRICS,
  });
  writeText(SCORECARD_PATH, buildScorecardMarkdown());

  process.stdout.write(
    [
      "# JudgmentKit Music Standalone Comparison",
      "",
      `Comparison id: ${COMPARISON_ID}`,
      `Task: ${TASK_PROMPT}`,
      "",
      `Source brief: ${path.relative(ROOT_DIR, BRIEF_PATH)}`,
      `Version A: ${path.relative(ROOT_DIR, VERSION_A_PATH)}`,
      `Version B: ${path.relative(ROOT_DIR, VERSION_B_PATH)}`,
      `Manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)}`,
      `Scorecard: ${path.relative(ROOT_DIR, SCORECARD_PATH)}`,
      "",
      `Guided handoff status: ${handoff.handoff_status}`,
      `Workflow review status: ${workflowReview.review_status}`,
      "",
    ].join("\n"),
  );
}

main();
