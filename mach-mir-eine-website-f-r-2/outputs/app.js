const STORAGE_KEY = "school-tournament-v1";
const ADMIN_PIN = "1234";

const defaultState = {
  teams: [],
  matches: [],
  admin: false
};

let state = loadState();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  adminState: $("#adminState"),
  adminToggle: $("#adminToggle"),
  adminDialog: $("#adminDialog"),
  adminPin: $("#adminPin"),
  adminError: $("#adminError"),
  loginButton: $("#loginButton"),
  tabs: $$(".tab"),
  views: $$(".view"),
  teamForm: $("#teamForm"),
  teamName: $("#teamName"),
  teamColor: $("#teamColor"),
  teamsList: $("#teamsList"),
  matchForm: $("#matchForm"),
  newMatchButton: $("#newMatchButton"),
  matchTeamA: $("#matchTeamA"),
  matchTeamB: $("#matchTeamB"),
  matchTime: $("#matchTime"),
  matchesList: $("#matchesList"),
  standingsBody: $("#standingsBody"),
  teamCount: $("#teamCount"),
  matchCount: $("#matchCount"),
  playedCount: $("#playedCount"),
  demoData: $("#demoData"),
  exportData: $("#exportData"),
  importData: $("#importData"),
  clearData: $("#clearData")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultState, ...saved, admin: false };
  } catch {
    return { ...defaultState };
  }
}

function persist() {
  const { admin, ...safeState } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function getTeam(teamId) {
  return state.teams.find(team => team.id === teamId);
}

function setAdmin(active) {
  state.admin = active;
  document.body.classList.toggle("is-admin", active);
  els.adminState.textContent = active ? "Admin" : "Zuschauer";
  els.adminState.classList.toggle("admin", active);
  els.adminToggle.setAttribute("aria-label", active ? "Admin abmelden" : "Admin anmelden");
  els.adminToggle.title = active ? "Admin abmelden" : "Admin anmelden";
  render();
}

function switchView(viewId) {
  els.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.view === viewId));
  els.views.forEach(view => view.classList.toggle("active", view.id === viewId));
}

function render() {
  renderStats();
  renderTeamOptions();
  renderTeams();
  renderMatches();
  renderStandings();
}

function renderStats() {
  els.teamCount.textContent = state.teams.length;
  els.matchCount.textContent = state.matches.length;
  els.playedCount.textContent = state.matches.filter(match => isPlayed(match)).length;
}

function renderTeamOptions() {
  const options = state.teams
    .map(team => `<option value="${team.id}">${escapeText(team.name)}</option>`)
    .join("");
  els.matchTeamA.innerHTML = options;
  els.matchTeamB.innerHTML = options;
}

function renderTeams() {
  if (!state.teams.length) {
    els.teamsList.innerHTML = `<div class="empty-state">Noch keine Klassen.</div>`;
    return;
  }

  els.teamsList.innerHTML = state.teams.map(team => `
    <article class="team-card">
      <div class="left">
        <span class="color-dot" style="background:${team.color}"></span>
        <strong>${escapeText(team.name)}</strong>
      </div>
      <button class="delete-team admin-only icon-button small" data-id="${team.id}" type="button" aria-label="Klasse loeschen" title="Klasse loeschen">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path></svg>
      </button>
    </article>
  `).join("");
}

function renderMatches() {
  if (!state.matches.length) {
    els.matchesList.innerHTML = `<div class="empty-state">Noch keine Spiele.</div>`;
    return;
  }

  els.matchesList.innerHTML = "";
  state.matches.forEach(match => {
    const teamA = getTeam(match.teamA);
    const teamB = getTeam(match.teamB);
    if (!teamA || !teamB) return;

    const node = $("#matchTemplate").content.firstElementChild.cloneNode(true);
    node.dataset.id = match.id;
    $(".time", node).textContent = match.time || "ohne Zeit";
    $(".delete-match", node).dataset.id = match.id;
    $(".match-teams", node).innerHTML = `
      <div class="team-side home">
        <span class="color-dot" style="background:${teamA.color}"></span>
        <span class="team-name">${escapeText(teamA.name)}</span>
      </div>
      <div class="score ${isPlayed(match) ? "" : "pending"}">
        <span>${isPlayed(match) ? match.scoreA : "-"}</span>
        <span>:</span>
        <span>${isPlayed(match) ? match.scoreB : "-"}</span>
      </div>
      <div class="team-side away">
        <span class="color-dot" style="background:${teamB.color}"></span>
        <span class="team-name">${escapeText(teamB.name)}</span>
      </div>
    `;
    $(".score-a", node).value = match.scoreA ?? "";
    $(".score-b", node).value = match.scoreB ?? "";
    els.matchesList.append(node);
  });
}

function isPlayed(match) {
  return Number.isInteger(match.scoreA) && Number.isInteger(match.scoreB);
}

function renderStandings() {
  const rows = buildStandings();
  if (!rows.length) {
    els.standingsBody.innerHTML = `<tr><td colspan="9">Noch keine Klassen.</td></tr>`;
    return;
  }

  els.standingsBody.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><span class="color-dot" style="background:${row.color}"></span> ${escapeText(row.name)}</td>
      <td>${row.played}</td>
      <td>${row.wins}</td>
      <td>${row.draws}</td>
      <td>${row.losses}</td>
      <td>${row.goalsFor}:${row.goalsAgainst}</td>
      <td>${row.diff}</td>
      <td>${row.points}</td>
    </tr>
  `).join("");
}

function buildStandings() {
  const table = new Map(state.teams.map(team => [team.id, {
    ...team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    diff: 0,
    points: 0
  }]));

  state.matches.filter(isPlayed).forEach(match => {
    const a = table.get(match.teamA);
    const b = table.get(match.teamB);
    if (!a || !b) return;

    a.played += 1;
    b.played += 1;
    a.goalsFor += match.scoreA;
    a.goalsAgainst += match.scoreB;
    b.goalsFor += match.scoreB;
    b.goalsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) {
      a.wins += 1;
      b.losses += 1;
      a.points += 3;
    } else if (match.scoreA < match.scoreB) {
      b.wins += 1;
      a.losses += 1;
      b.points += 3;
    } else {
      a.draws += 1;
      b.draws += 1;
      a.points += 1;
      b.points += 1;
    }
  });

  return [...table.values()]
    .map(row => ({ ...row, diff: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name, "de")
    );
}

function addTeam(name, color) {
  state.teams.push({ id: id("team"), name: name.trim(), color });
  persist();
  render();
}

function deleteTeam(teamId) {
  state.teams = state.teams.filter(team => team.id !== teamId);
  state.matches = state.matches.filter(match => match.teamA !== teamId && match.teamB !== teamId);
  persist();
  render();
}

function addMatch(teamA, teamB, time) {
  state.matches.push({
    id: id("match"),
    teamA,
    teamB,
    time: time.trim(),
    scoreA: null,
    scoreB: null
  });
  persist();
  render();
}

function updateScore(matchId, side, value) {
  const match = state.matches.find(item => item.id === matchId);
  if (!match) return;
  const parsed = value === "" ? null : Math.max(0, Number.parseInt(value, 10) || 0);
  match[side] = parsed;
  persist();
  render();
}

function stepScore(matchId, side, amount) {
  const match = state.matches.find(item => item.id === matchId);
  if (!match) return;
  const current = Number.isInteger(match[side]) ? match[side] : 0;
  match[side] = Math.max(0, current + amount);
  persist();
  render();
}

function deleteMatch(matchId) {
  state.matches = state.matches.filter(match => match.id !== matchId);
  persist();
  render();
}

function loadDemo() {
  const teams = [
    { id: "team-7a", name: "7a", color: "#0f8f7d" },
    { id: "team-7b", name: "7b", color: "#2563eb" },
    { id: "team-8a", name: "8a", color: "#d59b18" },
    { id: "team-8b", name: "8b", color: "#c2413b" }
  ];
  state.teams = teams;
  state.matches = [
    { id: "match-1", teamA: "team-7a", teamB: "team-7b", time: "09:00", scoreA: 2, scoreB: 1 },
    { id: "match-2", teamA: "team-8a", teamB: "team-8b", time: "09:20", scoreA: null, scoreB: null },
    { id: "match-3", teamA: "team-7a", teamB: "team-8a", time: "09:40", scoreA: 0, scoreB: 0 }
  ];
  persist();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify({
    teams: state.teams,
    matches: state.matches
  }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "schulturnier-daten.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.teams) || !Array.isArray(data.matches)) return;
      state.teams = data.teams;
      state.matches = data.matches;
      persist();
      render();
    } catch {
      window.alert("Import konnte nicht gelesen werden.");
    }
  });
  reader.readAsText(file);
}

els.tabs.forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

els.adminToggle.addEventListener("click", () => {
  if (state.admin) {
    setAdmin(false);
    return;
  }
  els.adminPin.value = "";
  els.adminError.textContent = "";
  els.adminDialog.showModal();
  els.adminPin.focus();
});

els.loginButton.addEventListener("click", () => {
  if (els.adminPin.value !== ADMIN_PIN) {
    els.adminError.textContent = "Falsche PIN.";
    return;
  }
  els.adminDialog.close();
  setAdmin(true);
});

els.adminPin.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    els.loginButton.click();
  }
});

els.teamForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = els.teamName.value.trim();
  if (!name) return;
  addTeam(name, els.teamColor.value);
  els.teamName.value = "";
  els.teamName.focus();
});

els.newMatchButton.addEventListener("click", () => {
  els.matchForm.classList.toggle("hidden");
});

els.matchForm.addEventListener("submit", event => {
  event.preventDefault();
  const teamA = els.matchTeamA.value;
  const teamB = els.matchTeamB.value;
  if (!teamA || !teamB || teamA === teamB) {
    window.alert("Bitte zwei verschiedene Klassen auswaehlen.");
    return;
  }
  addMatch(teamA, teamB, els.matchTime.value);
  els.matchTime.value = "";
  els.matchForm.classList.add("hidden");
});

els.teamsList.addEventListener("click", event => {
  const button = event.target.closest(".delete-team");
  if (!button) return;
  deleteTeam(button.dataset.id);
});

els.matchesList.addEventListener("input", event => {
  const card = event.target.closest(".match-card");
  if (!card) return;
  if (event.target.classList.contains("score-a")) updateScore(card.dataset.id, "scoreA", event.target.value);
  if (event.target.classList.contains("score-b")) updateScore(card.dataset.id, "scoreB", event.target.value);
});

els.matchesList.addEventListener("click", event => {
  const card = event.target.closest(".match-card");
  if (!card) return;
  const target = event.target.closest("button");
  if (!target) return;

  if (target.classList.contains("delete-match")) deleteMatch(card.dataset.id);
  if (target.classList.contains("minus-a")) stepScore(card.dataset.id, "scoreA", -1);
  if (target.classList.contains("plus-a")) stepScore(card.dataset.id, "scoreA", 1);
  if (target.classList.contains("minus-b")) stepScore(card.dataset.id, "scoreB", -1);
  if (target.classList.contains("plus-b")) stepScore(card.dataset.id, "scoreB", 1);
});

els.demoData.addEventListener("click", loadDemo);
els.exportData.addEventListener("click", exportData);
els.importData.addEventListener("change", event => {
  const [file] = event.target.files;
  if (file) importData(file);
  event.target.value = "";
});

els.clearData.addEventListener("click", () => {
  if (!window.confirm("Alle Turnierdaten loeschen?")) return;
  state.teams = [];
  state.matches = [];
  persist();
  render();
});

setAdmin(false);
