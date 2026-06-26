const STORAGE_KEY = "siglo21-teclab-asistencia-v1";

const initialData = {
  currentUser: "RRHH",
  month: new Date().toISOString().slice(0, 7),
  holidays: [{ date: "2026-06-20", name: "Feriado nacional" }],
  advisors: [
    { id: "a1", name: "Agustina Fernandez", turno: "Manana", active: true, startDate: "2024-02-12", endDate: null },
    { id: "a2", name: "Bruno Lima", turno: "Tarde", active: true, startDate: "2023-08-01", endDate: null },
    { id: "a3", name: "Camila Rojas", turno: "Noche", active: true, startDate: "2025-01-20", endDate: null }
  ],
  attendance: [
    { id: "r1", advisorId: "a1", date: "2026-06-01", status: "P", hours: 0, notes: "Puntual" },
    { id: "r2", advisorId: "a2", date: "2026-06-01", status: "AM", hours: 2, notes: "Retiro anticipado" }
  ],
  guards: [{ id: "g1", advisorId: "a2", date: "2026-06-21", hours: 6, notes: "Soporte campus" }],
  licenses: [{ id: "l1", advisorId: "a1", type: "Vacaciones", from: "2026-06-10", to: "2026-06-14", status: "Aprobada", notes: "" }],
  audit: [{ id: "u1", at: new Date().toISOString(), user: "Sistema", action: "Carga inicial", detail: "Base creada" }]
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(initialData);
  } catch {
    return clone(initialData);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
