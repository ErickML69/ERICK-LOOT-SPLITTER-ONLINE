document.addEventListener('DOMContentLoaded', cargarHistorial);

let historialReportes = [];

/**
 * Carga el historial desde localStorage y lo dibuja en el DOM.
 */
function cargarHistorial() {
    try {
        // Mantenemos el campo cofreStatus en los datos, pero lo ignoramos en la visualización de la tarjeta.
        historialReportes = JSON.parse(localStorage.getItem('reporteHistory')) || [];
    } catch (e) {
        console.error("Error al cargar el historial.", e);
        historialReportes = [];
    }
    dibujarReportes();
}

/**
 * Guarda el historial actual en localStorage (por si se elimina un reporte).
 */
function guardarHistorial() {
    localStorage.setItem('reporteHistory', JSON.stringify(historialReportes));
}

/**
 * Dibuja todas las tarjetas de reportes.
 */
function dibujarReportes() {
    const container = document.getElementById('historialContainer');
    if (!container) return;

    if (historialReportes.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No hay reportes guardados.</p>';
        return;
    }
    
    container.innerHTML = ''; // Limpiar antes de redibujar

    historialReportes.forEach((reporte, index) => {
        container.appendChild(crearTarjetaReporte(reporte, index));
    });
}

/**
 * Crea el elemento HTML (tarjeta) para un reporte.
 * @param {object} reporte - El objeto de reporte.
 * @param {number} index - El índice en el array `historialReportes`.
 * @returns {HTMLElement} La tarjeta del reporte.
 */
function crearTarjetaReporte(reporte, index) {
    const card = document.createElement('div');
    card.className = 'report-card';
    
    const data = reporte.reporteData;
    const participantes = reporte.participantes;

    const totalJugadores = participantes.filter(p => p.botin.silver > 0 || p.botin.dinero > 0).length;
    
    // Generar lista de participantes activos
    const participantesHTML = participantes.map(p => {
        if (p.botin.dinero > 0 || p.botin.silver > 0) {
             const botinObj = p.botin.dinero.toLocaleString('es-ES');
             const botinSilv = p.botin.silver.toLocaleString('es-ES');
             return `<li>${p.nombre} <span style="color: #ccc; font-size: 0.9em;">(${botinObj} obj / ${botinSilv} silv)</span></li>`;
        }
        return '';
    }).filter(html => html.length > 0).join('');

    const descuentoTag = data.costoReparacion > 0 
        ? `<span class="reparacion-tag">Reparación (${data.costoReparacion.toLocaleString('es-ES')})</span>` 
        : '';

    card.innerHTML = `
        <div class="card-header">
            <h3>${data.nombreCofre}</h3>
            <span>${reporte.fecha}</span>
        </div>
        
        <div class="card-body">
            <p>Tipo: <strong>${reporte.tipo}</strong> ${descuentoTag}</p>
            <p>Jugadores con Loot: <strong>${totalJugadores}</strong></p>
            
            <div class="loot-summary">
                <p>Botín Objetos (Total): <strong style="color: var(--color-exito);">${data.totalDineroDistribuible.toLocaleString('es-ES')}</strong></p>
                <p>Botín Silver (Total): <strong style="color: var(--color-exito);">${data.totalSilverDistribuible.toLocaleString('es-ES')}</strong></p>
                <p>Botín por Jugador: <strong>${(data.totalDineroDistribuible / totalJugadores).toLocaleString('es-ES', {maximumFractionDigits: 0})} obj / ${(data.totalSilverDistribuible / totalJugadores).toLocaleString('es-ES', {maximumFractionDigits: 0})} silv</strong></p>
            </div>

            <div class="participants-list">
                <p style="font-weight: bold; border-bottom: 1px dashed #555;">Jugadores en el Reparto:</p>
                <ul>${participantesHTML}</ul>
            </div>
        </div>
        
        <div class="action-group">
            <button class="btn-view" onclick="mostrarReporteCompleto(${index})">
                👁️ Ver Reporte Completo
            </button>
            <button class="btn-copy" onclick="copiarReporteDiscord(${index})">
                📋 Copiar para Discord
            </button>
        </div>

        <button class="eliminar-btn" style="margin-top: 5px; width: 100%; background-color: #555;" onclick="eliminarReporte(${index})">
            Eliminar Reporte
        </button>
    `;

    return card;
}

// ==========================================================
// NUEVAS FUNCIONES DE VISUALIZACIÓN Y COPIADO
// ==========================================================

/**
 * Genera el reporte completo en formato de texto estático para el modal.
 * @param {number} index - El índice del reporte.
 */
function mostrarReporteCompleto(index) {
    const reporte = historialReportes[index];
    if (!reporte) return;

    const data = reporte.reporteData;
    const participantesActivos = reporte.participantes.filter(p => p.botin.silver > 0 || p.botin.dinero > 0);
    const totalJugadores = participantesActivos.length;

    let reporteText = `
═════════════[ HIYOKO LOOT SPLIT ]═════════════
📅 Fecha: ${reporte.fecha}
🗺️ Actividad: ${data.nombreCofre}
💎 Tipo de Botín: ${reporte.tipo}

Total Original (Silver/Objetos):
  💰 Silver: ${data.totalSilverOriginal.toLocaleString('es-ES')}
  📦 Objetos: ${data.totalDineroOriginal.toLocaleString('es-ES')}
${data.costoReparacion > 0 ? 
`🛠️ Costo de Reparación (${data.tipoDescuento}): ${data.costoReparacion.toLocaleString('es-ES')}` 
: ''}
-----------------------------------------------
Total Distribuible (${totalJugadores} Participantes):
  💰 Silver: ${data.totalSilverDistribuible.toLocaleString('es-ES')}
  📦 Objetos: ${data.totalDineroDistribuible.toLocaleString('es-ES')}

-----------------------------------------------
📊 Reparto Individual por Jugador:
  💰 Silver: ${participantesActivos[0]?.botin.silver.toLocaleString('es-ES') || 0}
  📦 Objetos: ${participantesActivos[0]?.botin.dinero.toLocaleString('es-ES') || 0}
-----------------------------------------------

Jugadores con su Ubicación de Cofre:
`;

    participantesActivos.forEach(p => {
        reporteText += `  - ${p.nombre} (Cofre: ${p.numeroCofre ? `#${p.numeroCofre}` : '?'})\n`;
    });

    document.getElementById('reporteCompletoContent').innerText = reporteText.trim();
    document.getElementById('reporteModal').style.display = 'block';
}
window.mostrarReporteCompleto = mostrarReporteCompleto;

function closeReporteModal() {
    document.getElementById('reporteModal').style.display = 'none';
}
window.closeReporteModal = closeReporteModal;


/**
 * Genera el reporte en formato bloque de código de Discord y lo copia al portapapeles.
 * @param {number} index - El índice del reporte.
 */
function copiarReporteDiscord(index) {
    const reporte = historialReportes[index];
    if (!reporte) return;

    const data = reporte.reporteData;
    const participantesActivos = reporte.participantes.filter(p => p.botin.silver > 0 || p.botin.dinero > 0);
    const totalJugadores = participantesActivos.length;
    
    const silverPorJugador = participantesActivos[0]?.botin.silver.toLocaleString('es-ES') || 0;
    const objetosPorJugador = participantesActivos[0]?.botin.dinero.toLocaleString('es-ES') || 0;

    let reparacionInfo = "";
    if (data.costoReparacion > 0) {
        reparacionInfo = `🛠️ REPARACIÓN DEDUCIDA: ${data.costoReparacion.toLocaleString('es-ES')} ${data.tipoDescuento.toUpperCase()}`;
    }

    let reporteDiscord = `
\`\`\`ansi
[2;33m┏━━━━━━━━━━━━━━━━━━━[ HIYOKO LOOT SPLIT ]━━━━━━━━━━━━━━━━━━━┓[0m
[2;36m║ 📅 FECHA:[0m ${reporte.fecha}
[2;36m║ 🗺️ ACTIVIDAD:[0m ${data.nombreCofre} (Tipo: ${reporte.tipo})
${reparacionInfo ? `[2;31m║ ${reparacionInfo}[0m` : ''}
[2;33m┣━━━━━━━━━━━━━━━━━━━[ RESUMEN DE REPARTO (${totalJugadores} JUGADORES) ]━━━━━━━━━━━━━━━━━━━┫[0m
[2;32m║ 💰 TOTAL SILVER:[0m ${data.totalSilverDistribuible.toLocaleString('es-ES')}
[2;32m║ 📦 TOTAL OBJETOS:[0m ${data.totalDineroDistribuible.toLocaleString('es-ES')}
[2;33m┣━━━━━━━━━━━━━━━━━━━━━━━━[ PAGO INDIVIDUAL ]━━━━━━━━━━━━━━━━━━━━━━━━━┫[0m
[2;32m║ 🎁 LOOT POR JUGADOR:[0m 
[2;32m║    - Silver:[0m ${silverPorJugador}
[2;32m║    - Objetos:[0m ${objetosPorJugador}
[2;33m┣━━━━━━━━━━━━━━━━━━━━━━━━━[ JUGADORES ]━━━━━━━━━━━━━━━━━━━━━━━━━━━┫[0m
`;

    // Jugadores con su ubicación de cofre
    participantesActivos.forEach(p => {
        reporteDiscord += `[2;37m║  - ${p.nombre}[0m (Cofre #${p.numeroCofre ? p.numeroCofre : '?'})\n`;
    });
    
    reporteDiscord += `[2;33m┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛[0m
\`\`\``;

    // Quitar saltos de línea y espacios sobrantes del inicio/final.
    reporteDiscord = reporteDiscord.trim();

    navigator.clipboard.writeText(reporteDiscord).then(() => {
        alert(`✅ Reporte de Discord copiado para ${data.nombreCofre}!`);
    }, (err) => {
        console.error('Error al copiar el texto: ', err);
        alert('❌ Error al copiar el reporte. Intenta manualmente.');
    });
}
window.copiarReporteDiscord = copiarReporteDiscord;


// ==========================================================
// FUNCIONES DE MANTENIMIENTO (Se mantienen igual)
// ==========================================================

/**
 * Elimina un reporte del historial.
 * @param {number} index - El índice del reporte a eliminar.
 */
function eliminarReporte(index) {
    if (confirm(`¿Estás seguro de que quieres eliminar el reporte "${historialReportes[index].reporteData.nombreCofre}"?`)) {
        historialReportes.splice(index, 1);
        guardarHistorial();
        dibujarReportes();
    }
}
window.eliminarReporte = eliminarReporte;

/**
 * Confirma y borra todo el historial.
 */
function confirmarBorrarHistorial() {
    if (confirm("¡ATENCIÓN! ¿Estás seguro de que quieres borrar TODOS los reportes del historial? Esta acción es irreversible.")) {
        historialReportes = [];
        guardarHistorial();
        dibujarReportes();
        alert("Historial borrado con éxito.");
    }
}
window.confirmarBorrarHistorial = confirmarBorrarHistorial;