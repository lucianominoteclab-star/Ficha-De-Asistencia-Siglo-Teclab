
function renderTable() {
    const tableWrap = document.getElementById('table-wrap');
    let html = '<table><thead><tr><th>Nombre</th><th>Turno</th></tr></thead><tbody>';
    ASESORES.filter(a => a.activo).forEach(a => {
        html += `<tr onclick="openFicha('${a.n}')"><td>${a.n}</td><td>${a.t}</td></tr>`;
    });
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
}

function openAddAsesor() {
    showModal(`<h3>Nuevo Asesor</h3>
        <input id="new-name" placeholder="Nombre">
        <select id="new-turno"><option value="M">Mañana</option><option value="T">Tarde</option></select>
        <button onclick="confirmAddAsesor()">Guardar</button>`);
}

function confirmAddAsesor() {
    const n = document.getElementById('new-name').value;
    const t = document.getElementById('new-turno').value;
    if(n) { ASESORES.push({n, t, activo: true}); renderTable(); closeModal(); }
}

function openFicha(nombre) {
    const a = ASESORES.find(x => x.n === nombre);
    showModal(`<h3>Ficha: ${nombre}</h3>
        <p>Turno: ${a.t}</p>
        <button style="color:red" onclick="finalizarRelacion('${nombre}')">Finalizar relación laboral</button>
        <button onclick="closeModal()">Cerrar</button>`);
}

function finalizarRelacion(nombre) {
    if(confirm('¿Finalizar?')) {
        ASESORES.find(x => x.n === nombre).activo = false;
        renderTable(); closeModal();
    }
}

function showModal(h) { document.getElementById('modal-box').innerHTML = h; document.getElementById('modal-layer').style.display = 'flex'; }
function closeModal() { document.getElementById('modal-layer').style.display = 'none'; }
function switchTab(t) { /* lógica de tabs */ }

renderTable();
