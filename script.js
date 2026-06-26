const state = loadState();
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const statuses = { P:["Presente","ti-check"], F:["Falta","ti-x"], D:["Dia medico","ti-stethoscope"], L:["Licencia","ti-file-certificate"], FNJ:["Falta no justificada","ti-alert-triangle"], AM:["Horas a deber","ti-clock"] };
let selected = null, installPrompt = null, charts = {};

const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const advisor = (id) => state.advisors.find(a => a.id === id);
const rec = (aid, date) => state.attendance.find(r => r.advisorId === aid && r.date === date);
const days = () => { const [y,m] = state.month.split("-").map(Number); return new Date(y,m,0).getDate(); };
const iso = (d) => `${state.month}-${String(d).padStart(2,"0")}`;
const fmt = (d) => new Date(d+"T00:00:00").toLocaleDateString("es-AR");
const isHoliday = (d) => state.holidays.some(h => h.date === d);
const isWeekend = (d) => [0,6].includes(new Date(d+"T00:00:00").getDay());
const monthName = () => { const [y,m] = state.month.split("-").map(Number); return new Date(y,m-1,1).toLocaleDateString("es-AR",{month:"long",year:"numeric"}); };

function audit(action, detail) {
  state.audit.unshift({ id:uid("u"), at:new Date().toISOString(), user:state.currentUser, action, detail });
  saveState(state);
  render();
}

function filteredAdvisors() {
  const q = $("#search").value.toLowerCase();
  const t = $("#turno").value;
  return state.advisors.filter(a => a.name.toLowerCase().includes(q) && (!t || a.turno === t));
}

function pill(r) {
  if (!r) return `<span class="pill empty">+</span>`;
  const [label, icon] = statuses[r.status] || [r.status,"ti-point"];
  const hours = r.status === "AM" && r.hours ? ` ${r.hours}h` : "";
  return `<span class="pill s-${r.status}" title="${label}"><i class="ti ${icon}"></i>${r.status}${hours}</span>`;
}

function renderTurnos() {
  const old = $("#turno").value;
  const turnos = [...new Set(state.advisors.map(a => a.turno))].sort();
  $("#turno").innerHTML = `<option value="">Todos los turnos</option>` + turnos.map(t => `<option>${t}</option>`).join("");
  $("#turno").value = turnos.includes(old) ? old : "";
}

function renderAttendance() {
  $("#monthLabel").textContent = monthName();
  $("#thead").innerHTML = `<tr><th>Asesor</th>${Array.from({length:days()},(_,i)=>{
    const d = iso(i+1);
    return `<th class="${isWeekend(d)?"weekend":""} ${isHoliday(d)?"holiday":""}">${i+1}</th>`;
  }).join("")}</tr>`;
  $("#tbody").innerHTML = filteredAdvisors().map(a => `<tr><td><button class="name" data-profile="${a.id}">${a.name}</button> <span class="badge">${a.turno}</span> ${a.active?"":"<span class='badge'>Inactivo</span>"}</td>${Array.from({length:days()},(_,i)=>{
    const d = iso(i+1);
    return `<td class="day ${isWeekend(d)?"weekend":""} ${isHoliday(d)?"holiday":""}" data-a="${a.id}" data-d="${d}">${pill(rec(a.id,d))}</td>`;
  }).join("")}</tr>`).join("");
}

function renderStats() {
  const month = state.attendance.filter(r => r.date.startsWith(state.month));
  const p = month.filter(r => r.status === "P").length;
  const f = month.filter(r => ["F","FNJ"].includes(r.status)).length;
  const total = month.length || 1;
  $("#activeCount").textContent = state.advisors.filter(a => a.active).length;
  $("#presentRate").textContent = Math.round(p / total * 100) + "%";
  $("#absenceRate").textContent = Math.round(f / total * 100) + "%";
  $("#owedHours").textContent = state.attendance.reduce((s,r) => s + Number(r.hours || 0), 0) + " h";
}

function renderGuards() {
  const special = Array.from({length:days()},(_,i)=>iso(i+1)).filter(d => new Date(d+"T00:00:00").getDay() === 0 || isHoliday(d));
  $("#guards").innerHTML = special.map(d => {
    const items = state.guards.filter(g => g.date === d);
    return `<article class="card"><span class="badge">${isHoliday(d) ? state.holidays.find(h=>h.date===d).name : "Domingo"}</span><h3>${fmt(d)}</h3>${items.map(g=>`<p>${advisor(g.advisorId)?.name || "Sin asesor"} - ${g.hours} h</p>`).join("") || "<p class='muted'>Sin guardias.</p>"}<button data-guard="${d}">Asignar guardia</button></article>`;
  }).join("");
}

function renderLicenses() {
  $("#licenses").innerHTML = state.licenses.map(l => `<article><div><b>${advisor(l.advisorId)?.name || "Sin asesor"}</b><p>${l.type}: ${fmt(l.from)} al ${fmt(l.to)}</p><small>${l.notes || ""}</small></div><div><span class="badge">${l.status}</span> <button data-license="${l.id}" data-status="Aprobada">Aprobar</button> <button data-license="${l.id}" data-status="Rechazada">Rechazar</button></div></article>`).join("") || "<p>Sin solicitudes.</p>";
}

function renderAudit() {
  $("#audit").innerHTML = state.audit.map(u => `<article><div><b>${u.action}</b><p>${u.detail}</p></div><small>${new Date(u.at).toLocaleString("es-AR")} - ${u.user}</small></article>`).join("") || "<p>Sin cambios.</p>";
}

function renderCharts() {
  if (!window.Chart) return;
  const month = state.attendance.filter(r => r.date.startsWith(state.month));
  const labels = Object.keys(statuses);
  charts.c1?.destroy(); charts.c2?.destroy();
  charts.c1 = new Chart($("#chart1"), { type:"doughnut", data:{ labels, datasets:[{ data:labels.map(s=>month.filter(r=>r.status===s).length), backgroundColor:["#26865f","#c2413c","#2f7d7e","#5c8fcb","#8b2f2a","#f3a712"] }] }, options:{ plugins:{ title:{ display:true, text:"Presentismo y ausentismo" } } } });
  const owed = state.advisors.map(a => ({ name:a.name.split(" ")[0], h:state.attendance.filter(r=>r.advisorId===a.id).reduce((s,r)=>s+Number(r.hours||0),0) })).filter(x=>x.h);
  charts.c2 = new Chart($("#chart2"), { type:"bar", data:{ labels:owed.map(x=>x.name), datasets:[{ label:"Horas adeudadas", data:owed.map(x=>x.h), backgroundColor:"#f3a712" }] }, options:{ scales:{ y:{ beginAtZero:true } }, plugins:{ title:{ display:true, text:"Horas adeudadas por asesor" } } } });
}

function render() {
  renderTurnos(); renderAttendance(); renderStats(); renderGuards(); renderLicenses(); renderAudit(); renderCharts();
}

function setAttendance(aid, date, status) {
  let hours = 0;
  if (status === "AM") {
    const value = prompt("Cantidad de horas a deber:", "1");
    if (value === null) return;
    hours = Number(value.replace(",", "."));
    if (!hours || hours < 0) return alert("Ingresá horas válidas.");
  }
  const notes = prompt("Observaciones del día:", rec(aid,date)?.notes || "") || "";
  const old = rec(aid,date);
  if (old) Object.assign(old, { status, hours, notes });
  else state.attendance.push({ id:uid("r"), advisorId:aid, date, status, hours, notes });
  audit("Asistencia modificada", `${advisor(aid).name}: ${status} el ${fmt(date)}${hours ? " - " + hours + " h" : ""}`);
}

function openMenu(e, aid, date) {
  selected = { aid, date };
  $("#menu").innerHTML = Object.entries(statuses).map(([s,m]) => `<button data-status="${s}"><i class="ti ${m[1]}"></i>${s} - ${m[0]}</button>`).join("") + `<button data-clear="1"><i class="ti ti-eraser"></i>Limpiar</button>`;
  $("#menu").style.left = Math.min(e.clientX, innerWidth - 210) + "px";
  $("#menu").style.top = Math.min(e.clientY, innerHeight - 260) + "px";
  $("#menu").hidden = false;
}

function openProfile(id) {
  const a = advisor(id);
  const records = state.attendance.filter(r => r.advisorId === id).sort((x,y)=>y.date.localeCompare(x.date));
  const owed = records.reduce((s,r)=>s+Number(r.hours||0),0);
  $("#modalBody").innerHTML = `<h2>${a.name}</h2><p><b>Turno:</b> ${a.turno}</p><p><b>Ingreso:</b> ${fmt(a.startDate)}</p><p><b>Horas adeudadas:</b> ${owed} h</p><h3>Historial completo</h3>${records.map(r=>`<p>${fmt(r.date)} ${pill(r)} ${r.notes||""}</p>`).join("") || "<p>Sin historial.</p>"}${a.active ? `<button id="endJob">Finalizar relacion laboral</button>` : `<p>Baja: ${fmt(a.endDate)}</p>`}`;
  $("#modal").showModal();
  $("#endJob")?.addEventListener("click", () => {
    const d = prompt("Fecha de baja AAAA-MM-DD:", new Date().toISOString().slice(0,10));
    if (!d) return;
    a.active = false; a.endDate = d;
    $("#modal").close();
    audit("Baja laboral", `${a.name} - ${fmt(d)}`);
  });
}

function form(title, html, onSave) {
  $("#modalBody").innerHTML = `<h2>${title}</h2><div class="form">${html}<button id="saveForm">Guardar</button></div>`;
  $("#modal").showModal();
  $("#saveForm").onclick = onSave;
}

function advisorOptions() {
  return state.advisors.filter(a=>a.active).map(a=>`<option value="${a.id}">${a.name}</option>`).join("");
}

function exportCsv() {
  const rows = [["Asesor","Turno","Fecha","Estado","Horas","Observaciones"], ...state.attendance.map(r => [advisor(r.advisorId)?.name || "", advisor(r.advisorId)?.turno || "", r.date, r.status, r.hours || 0, r.notes || ""])];
  download(rows.map(row => row.map(c => `"${String(c).replaceAll('"','""')}"`).join(",")).join("\n"), "asistencia.csv", "text/csv");
  audit("Exportacion CSV", "Archivo CSV generado");
}

function exportXlsx() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.advisors), "Asesores");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.attendance), "Asistencia");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.guards), "Guardias");
  XLSX.writeFile(wb, "asistencia-siglo21.xlsx");
  audit("Exportacion Excel", "Archivo XLSX generado");
}

function download(content, name, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.addEventListener("click", e => {
  const day = e.target.closest(".day"), profile = e.target.closest("[data-profile]");
  const status = e.target.closest("[data-status]"), clear = e.target.closest("[data-clear]");
  const guard = e.target.closest("[data-guard]"), lic = e.target.closest("[data-license]");
  if (!e.target.closest("#menu")) $("#menu").hidden = true;
  if (day) openMenu(e, day.dataset.a, day.dataset.d);
  if (profile) openProfile(profile.dataset.profile);
  if (status && selected) setAttendance(selected.aid, selected.date, status.dataset.status);
  if (clear && selected) { state.attendance = state.attendance.filter(r => !(r.advisorId === selected.aid && r.date === selected.date)); audit("Asistencia eliminada", fmt(selected.date)); }
  if (guard) form("Asignar guardia", `<label>Asesor<select id="gA">${advisorOptions()}</select></label><label>Horas<input id="gH" type="number" value="6"></label><label>Notas<textarea id="gN"></textarea></label>`, () => { state.guards.push({ id:uid("g"), advisorId:$("#gA").value, date:guard.dataset.guard, hours:Number($("#gH").value), notes:$("#gN").value }); $("#modal").close(); audit("Guardia asignada", fmt(guard.dataset.guard)); });
  if (lic) { state.licenses.find(l=>l.id===lic.dataset.license).status = lic.dataset.status; audit("Licencia actualizada", lic.dataset.status); }
});

document.addEventListener("contextmenu", e => {
  const day = e.target.closest(".day");
  if (day) { e.preventDefault(); openMenu(e, day.dataset.a, day.dataset.d); }
});

$$(".tab").forEach(b => b.onclick = () => { $$(".tab,.panel").forEach(x=>x.classList.remove("active")); b.classList.add("active"); $("#" + b.dataset.tab).classList.add("active"); renderCharts(); });
$("#search").oninput = renderAttendance;
$("#turno").onchange = renderAttendance;
$("#prev").onclick = () => { const d = new Date(state.month+"-01T00:00:00"); d.setMonth(d.getMonth()-1); state.month = d.toISOString().slice(0,7); audit("Cambio de mes", monthName()); };
$("#next").onclick = () => { const d = new Date(state.month+"-01T00:00:00"); d.setMonth(d.getMonth()+1); state.month = d.toISOString().slice(0,7); audit("Cambio de mes", monthName()); };
$("#closeModal").onclick = () => $("#modal").close();
$("#darkBtn").onclick = () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "" : "dark"; localStorage.setItem("theme", document.documentElement.dataset.theme); renderCharts(); };
$("#newAdvisor").onclick = () => form("Nuevo asesor", `<label>Nombre<input id="aN"></label><label>Turno<input id="aT"></label><label>Ingreso<input id="aI" type="date" value="${new Date().toISOString().slice(0,10)}"></label>`, () => { state.advisors.push({ id:uid("a"), name:$("#aN").value, turno:$("#aT").value, active:true, startDate:$("#aI").value, endDate:null }); $("#modal").close(); audit("Nuevo asesor", $("#aN").value); });
$("#licenseBtn").onclick = () => form("Nueva licencia", `<label>Asesor<select id="lA">${advisorOptions()}</select></label><label>Tipo<select id="lT"><option>Vacaciones</option><option>Licencia medica</option><option>Estudio</option></select></label><label>Desde<input id="lF" type="date"></label><label>Hasta<input id="lTo" type="date"></label><label>Notas<textarea id="lN"></textarea></label>`, () => { state.licenses.push({ id:uid("l"), advisorId:$("#lA").value, type:$("#lT").value, from:$("#lF").value, to:$("#lTo").value, status:"Pendiente", notes:$("#lN").value }); $("#modal").close(); audit("Licencia solicitada", $("#lT").value); });
$("#holidayBtn").onclick = () => form("Agregar feriado", `<label>Fecha<input id="hD" type="date"></label><label>Nombre<input id="hN"></label>`, () => { state.holidays.push({ date:$("#hD").value, name:$("#hN").value }); $("#modal").close(); audit("Feriado agregado", $("#hN").value); });
$("#csvBtn").onclick = exportCsv;
$("#xlsxBtn").onclick = exportXlsx;
$("#backupBtn").onclick = () => download(JSON.stringify(state,null,2), "backup-asistencia.json", "application/json");
$("#restoreJson").onchange = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ Object.assign(state, JSON.parse(r.result)); audit("Backup restaurado", f.name); }; r.readAsText(f); };
$("#importXlsx").onchange = e => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const wb=XLSX.read(r.result,{type:"array"}); const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); alert(`Excel leido: ${rows.length} filas. Usar columnas compatibles para integracion final.`); audit("Importacion Excel", f.name); }; r.readAsArrayBuffer(f); };
$("#clearAudit").onclick = () => { state.audit=[]; saveState(state); render(); };
$("#installBtn").onclick = () => installPrompt ? installPrompt.prompt() : alert("La instalacion se habilita al abrir la app publicada.");
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; });
document.documentElement.dataset.theme = localStorage.getItem("theme") || "";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
render();
