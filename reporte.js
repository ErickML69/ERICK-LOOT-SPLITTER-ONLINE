document.addEventListener('DOMContentLoaded', () => {
    cargarYMostrarReporte();
});

// Función central para cargar los datos del reporte desde localStorage
function getReporteData() {
    try {
        const reporteJSON = localStorage.getItem('currentReport');
        if (reporteJSON) {
            return JSON.parse(reporteJSON);
        }
    } catch (e) {
        console.error("Error al cargar los datos del reporte.", e);
    }
    return null;
}

// Función principal que renderiza el HTML
function cargarYMostrarReporte() {
    const reporte = getReporteData();
    const openerRef = window.opener;

    if (!reporte || !openerRef || openerRef.closed) {
        document.body.innerHTML = '<div class="report-container"><h1 class="report-title">❌ Error al Cargar</h1><p>No se encontraron datos de reporte o la ventana principal fue cerrada.</p><p>Por favor, vuelve a generarlo desde la aplicación principal.</p></div>';
        return;
    }
    
    const data = reporte.reporteData;
    const participantesActivos = reporte.participantes.filter(p => p.botin.silver > 0 || p.botin.dinero > 0);
    const totalJugadores = participantesActivos.length;
    const silverPorJugador = participantesActivos[0]?.botin.silver.toLocaleString('es-ES') || 0;
    const objetosPorJugador = participantesActivos[0]?.botin.dinero.toLocaleString('es-ES') || 0;
    
    document.getElementById('reporteTitle').innerText = `Reporte de Loot: ${data.nombreCofre}`;
    document.getElementById('reporteActivity').innerText = `${data.nombreCofre} (Generado: ${reporte.fecha})`;
    
    let reparacionInfoHTML = "";
    if (data.costoReparacion > 0) {
        reparacionInfoHTML = `<p style="color: var(--color-error); font-weight: bold;">🛠️ Costo de Reparación (${data.tipoDescuento}): ${data.costoReparacion.toLocaleString('es-ES')}</p>`;
    }
    document.getElementById('reparacionInfo').innerHTML = reparacionInfoHTML;
    
    document.getElementById('summaryTotales').innerHTML = `<strong>Total Distribuible:</strong> 💰 Silver: ${data.totalSilverDistribuible.toLocaleString('es-ES')} | 📦 Objetos: ${data.totalDineroDistribuible.toLocaleString('es-ES')}`;
    document.getElementById('summaryIndividual').innerHTML = `<strong>Botín por Jugador (${totalJugadores} Part.):</strong> 💰 Silver: ${silverPorJugador} | 📦 Objetos: ${objetosPorJugador}`;


    // MAPEO CORREGIDO SEGÚN SOLICITUD DEL USUARIO (Vacío es Verde, Lleno es Rojo, etc.)
    const cofreStatusMap = {
        0: { emoji: '⚪', color: '#999', text: 'Pendiente', next: 1 }, // 0 -> 1 (Vacío)
        1: { emoji: '🟢', color: 'var(--color-exito)', text: 'Vacío', next: 2 }, // 1 -> 2 (Casi Lleno)
        2: { emoji: '🟡', color: 'var(--color-acento-dorado)', text: 'Casi Lleno', next: 3 }, // 2 -> 3 (Lleno)
        3: { emoji: '🔴', color: 'var(--color-error)', text: 'Lleno', next: 0 } // 3 -> 0 (Pendiente)
    };

    let listaDetalladaHTML = '';

    reporte.participantes.forEach((p) => {
        const cofreStatus = cofreStatusMap[p.cofreStatus] || cofreStatusMap[0];
        const siguienteCofreStatus = cofreStatus.next;
        
        const pagoStatus = p.pagado;
        const pagoEmoji = pagoStatus ? '✅' : '❌';
        const pagoColor = pagoStatus ? 'var(--color-exito)' : 'var(--color-error)';
        const siguientePagoStatus = !pagoStatus;
        
        // CORRECCIÓN: Estilos para hacer el loot más grande y visible (1.0em y bold)
        const recibioLoot = (p.botin.silver > 0 || p.botin.dinero > 0);
        const lootInfo = recibioLoot 
            ? `<span style="color: var(--color-acento-dorado); font-size:1.0em; font-weight: bold; margin-left: 10px;"> | 📦: ${p.botin.dinero.toLocaleString('es-ES')} | 💰: ${p.botin.silver.toLocaleString('es-ES')}</span>`
            : '';
        
        listaDetalladaHTML += `
            <li class="report-list-item">
                <span class="report-player-name">${p.nombre}</span>
                <span class="report-cofre-num">Cofre: ${p.numeroCofre ? `#${p.numeroCofre}` : '?'} ${lootInfo}</span> 
                
                <button 
                    class="report-check-btn"
                    style="color: ${pagoColor}; border: 2px solid ${pagoColor};"
                    onclick="alternarPago('${p.nombre}', ${siguientePagoStatus})" 
                    title="Alternar estado de pago/check"
                >
                    ${pagoEmoji}
                </button>
                
                <button 
                    class="report-cofre-status-btn"
                    style="background-color: ${cofreStatus.color};"
                    onclick="alternarCofre('${p.nombre}', ${siguienteCofreStatus})"
                    title="Alternar estado del cofre"
                >
                    ${cofreStatus.emoji} ${cofreStatus.text}
                </button>
            </li>
        `;
    });
    
    document.getElementById('participantesReporteList').innerHTML = listaDetalladaHTML;
}

// ==========================================================
// LÓGICA DE INTERACCIÓN DEL REPORTE (LLAMA AL PRINCIPAL)
// ==========================================================

function alternarPago(participanteNombre, siguienteStatus) {
    const openerRef = window.opener;
    if (openerRef && !openerRef.closed && openerRef.actualizarEstadoPagoEnReporte) {
        // Llama a la función de la ventana principal para actualizar los datos
        const exito = openerRef.actualizarEstadoPagoEnReporte(participanteNombre, siguienteStatus);
        if (exito) {
            // Si tiene éxito, se recarga la ventana del reporte para mostrar el cambio
            cargarYMostrarReporte(); 
        }
    } else {
        alert('Error: La ventana principal fue cerrada o la conexión se perdió. Por favor, abre el reporte desde la aplicación principal.');
    }
}

function alternarCofre(participanteNombre, siguienteStatus) {
    const openerRef = window.opener;
    if (openerRef && !openerRef.closed && openerRef.actualizarEstadoCofreEnReporte) {
        // Llama a la función de la ventana principal para actualizar los datos
        const exito = openerRef.actualizarEstadoCofreEnReporte(participanteNombre, siguienteStatus);
        if (exito) {
            // Si tiene éxito, se recarga la ventana del reporte para mostrar el cambio
            cargarYMostrarReporte(); 
        }
    } else {
        alert('Error: La ventana principal fue cerrada o la conexión se perdió. Por favor, abre el reporte desde la aplicación principal.');
    }
}


function copyDiscordANSI() {
    const openerRef = window.opener;
    const reporte = getReporteData();
    
    if (openerRef && !openerRef.closed && openerRef.generarTextoDiscordANSI && reporte) {
        const discordText = openerRef.generarTextoDiscordANSI(reporte); 
        navigator.clipboard.writeText(discordText).then(() => {
            alert('✅ Reporte de Discord (ANSI) copiado con éxito!');
        }, (err) => {
            console.error('Error al copiar el texto ANSI: ', err);
            alert('❌ Error al copiar el reporte ANSI. Intenta copiarlo manualmente.');
        });
    } else {
        alert('Error: No se pudo acceder a la función de copia del reporte. Vuelve a generar el reporte desde la ventana principal.');
    }
}