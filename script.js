// Variable global para almacenar el reporte actual (para el manejo de la ventana)
let participantes = [];
let entradasLoot = { 1: { dinero: 0, silver: 0 } };
let reparacionActiva = false; 
window.reporteAbierto = null; 

function initApp() {
    try {
        participantes = JSON.parse(localStorage.getItem('currentParticipants')) || [];
    } catch (e) {
        console.error("Error al cargar participantes, reiniciando lista.", e);
        participantes = [];
        localStorage.removeItem('currentParticipants');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Configuración inicial de UI (manteniendo tu lógica)
    if (window.innerWidth <= 768) {
        document.body.classList.remove('pc-mode');
        document.body.classList.add('phone-mode');
        const modeIcon = document.getElementById('mode-icon');
        if (modeIcon) modeIcon.innerText = '💻';
    } else {
        document.body.classList.remove('phone-mode');
        document.body.classList.add('pc-mode');
        const modeIcon = document.getElementById('mode-icon');
        if (modeIcon) modeIcon.innerText = '📱';
    }
    
    setupToggleButtons('toggleTipoCofre');
    setupToggleButtons('toggleTipoDescuento');

    setInterval(actualizarRelojUTC, 1000);
    actualizarRelojUTC(); 
    
    actualizarDatalist(); 
    actualizarListaParticipantes();
    dibujarEntradasLoot();
    generarReporteCompleto();
    
    const inputParticipante = document.getElementById('nombreParticipante');
    if (inputParticipante) {
        inputParticipante.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                agregarParticipante();
            }
        });
    }
});

function setupToggleButtons(groupId) {
    const group = document.getElementById(groupId);
    if (!group) return;

    group.querySelectorAll('.toggle-button').forEach(buttonLabel => {
        buttonLabel.addEventListener('click', function() {
            const inputId = buttonLabel.getAttribute('for');
            const correspondingInput = document.getElementById(inputId);
            
            if (correspondingInput) {
                correspondingInput.checked = true;
                
                group.querySelectorAll('.toggle-button').forEach(label => {
                    label.classList.remove('active');
                });
                buttonLabel.classList.add('active');

                correspondingInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });
}

function actualizarRelojUTC() {
    const ahora = new Date();
    const horas = ahora.getUTCHours().toString().padStart(2, '0');
    const minutos = ahora.getUTCMinutes().toString().padStart(2, '0');
    const segundos = ahora.getUTCSeconds().toString().padStart(2, '0');
    const clockElement = document.getElementById('utc-clock');
    if (clockElement) {
        clockElement.innerText = `UTC: ${horas}:${minutos}:${segundos}`;
    }
}

function guardarParticipantes() {
    localStorage.setItem('currentParticipants', JSON.stringify(participantes));
}

function limpiarYNormalizarNombre(nombre) {
    let nombreLimpio = nombre.trim();
    nombreLimpio = nombreLimpio.replace(/^\s*\d+\.\s*/, ''); 
    nombreLimpio = nombreLimpio.replace(/@\[H\]\s*|@\[\]\s*|@|\[|\]/gi, ''); 
    nombreLimpio = nombreLimpio.replace(/^\s*\d+\s*/, ''); 
    nombreLimpio = nombreLimpio.trim();

    if (nombreLimpio.length > 0) {
        return nombreLimpio.charAt(0).toUpperCase() + nombreLimpio.slice(1).toLowerCase();
    }
    return nombreLimpio;
}


function agregarParticipante(nombreJugador, isBulk = false) {
    let nombre;
    
    if (nombreJugador) {
        nombre = nombreJugador;
    } else {
        const input = document.getElementById('nombreParticipante');
        nombre = input.value.trim();
    }
    
    if (!nombre) return;
    
    const nombreNormalizado = limpiarYNormalizarNombre(nombre); 
    
    if (!nombreNormalizado) return;
    
    if (participantes.some(p => p.nombre === nombreNormalizado)) {
        if (!isBulk) alert(`"${nombreNormalizado}" ya está en la lista de participantes.`);
        if (!nombreJugador) document.getElementById('nombreParticipante').value = '';
        return;
    }

    const ubicacionesCofres = JSON.parse(localStorage.getItem('ubicacionesCofres')) || [];
    const cofre = ubicacionesCofres.find(item => item.jugador.toLowerCase() === nombreNormalizado.toLowerCase()); 
    
    const ubicacionInicial = cofre ? `Cofre #${cofre.numeroCofre}` : 'No Registrada ❓';
    const numeroCofreInicial = cofre ? cofre.numeroCofre : null;
    
    participantes.push({
        nombre: nombreNormalizado, 
        entradas: { entrada1: true, entrada2: false, entrada3: false, entrada4: false },
        cofreStatus: 0, 
        pagado: false, 
        ubicacionCofre: ubicacionInicial, 
        numeroCofre: numeroCofreInicial 
    });
    
    if (!nombreJugador) {
        document.getElementById('nombreParticipante').value = '';
    }
    
    actualizarListaParticipantes();
    actualizarDatalist(); 
    guardarParticipantes();
    generarReporteCompleto();
}

function procesarPegadoMasivo() {
    const textarea = document.getElementById('jugadoresBulk');
    const texto = textarea.value.trim();
    
    if (!texto) {
        alert("Por favor, pega la lista de jugadores.");
        return;
    }

    const lineas = texto.split('\n');
    let jugadoresNuevos = 0;

    lineas.forEach(linea => {
        const nombreLimpio = limpiarYNormalizarNombre(linea);
        if (nombreLimpio) {
            const esNuevo = !participantes.some(p => p.nombre === nombreLimpio);
            agregarParticipante(nombreLimpio, true);
            if(esNuevo) jugadoresNuevos++;
        }
    });

    if (jugadoresNuevos > 0) {
        actualizarListaParticipantes();
        actualizarDatalist();
        guardarParticipantes();
        generarReporteCompleto();
        alert(`Se añadieron ${jugadoresNuevos} participantes nuevos a la lista.`);
    } else {
         alert("No se añadió ningún participante nuevo. Verifica que no estén ya en la lista.");
    }
    
    textarea.value = '';
    document.getElementById('bulkPasteModal').style.display='none';
}
window.procesarPegadoMasivo = procesarPegadoMasivo;


function actualizarListaParticipantes() {
    const lista = document.getElementById('listaParticipantes');
    if (!lista) return; 
    
    lista.innerHTML = '';
    
    participantes.forEach((participante, index) => {
        
        let ubicacionDisplay = '';
        if (participante.numeroCofre) {
             ubicacionDisplay = `<span class="cofre-tag">📦 #${participante.numeroCofre}</span>`;
        } else if (participante.ubicacionCofre === 'No Registrada ❓') {
             ubicacionDisplay = `<span style="font-size: 0.8em; color: #999; margin-left: 5px;"> ${participante.ubicacionCofre}</span>`;
        }
        
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${index + 1}. ${participante.nombre} ${ubicacionDisplay}</span> 
            <div class="checkbox-group">
                <input type="checkbox" id="entrada1-${index}" onclick="actualizarEntradas(${index}, 'entrada1', this.checked); generarReporteCompleto()" ${participante.entradas.entrada1 ? 'checked' : ''}>
                <label for="entrada1-${index}">E1</label>
                <input type="checkbox" id="entrada2-${index}" onclick="actualizarEntradas(${index}, 'entrada2', this.checked); generarReporteCompleto()" ${participante.entradas.entrada2 ? 'checked' : ''}>
                <label for="entrada2-${index}">E2</label>
                <input type="checkbox" id="entrada3-${index}" onclick="actualizarEntradas(${index}, 'entrada3', this.checked); generarReporteCompleto()" ${participante.entradas.entrada3 ? 'checked' : ''}>
                <label for="entrada3-${index}">E3</label>
                <input type="checkbox" id="entrada4-${index}" onclick="actualizarEntradas(${index}, 'entrada4', this.checked); generarReporteCompleto()" ${participante.entradas.entrada4 ? 'checked' : ''}>
                <label for="entrada4-${index}">E4</label>
                <button class="eliminar-btn" onclick="eliminarParticipante(${index})">X</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function actualizarDatalist() {
    const datalistPrincipal = document.getElementById('lista-participantes'); 
    
    if (datalistPrincipal) {
        datalistPrincipal.innerHTML = '';
        const nombresParticipantes = participantes.map(p => p.nombre).sort((a, b) => a.localeCompare(b));
        
        [...new Set(nombresParticipantes)].forEach(jugador => { 
            const option = document.createElement('option');
            option.value = jugador;
            datalistPrincipal.appendChild(option);
        });
    }
}

function actualizarEntradas(index, entrada, estado) {
    participantes[index].entradas[entrada] = estado;
    guardarParticipantes();
}

function eliminarParticipante(index) {
    participantes.splice(index, 1);
    actualizarListaParticipantes();
    actualizarDatalist(); 
    guardarParticipantes();
    generarReporteCompleto();
}

function dibujarEntradasLoot() {
    const container = document.getElementById('entradasContainer');
    container.innerHTML = '';
    
    const entradasIds = Object.keys(entradasLoot).sort((a, b) => parseInt(a) - parseInt(b));

    entradasIds.forEach(id => {
        const idNum = parseInt(id);
        const loot = entradasLoot[idNum];
        
        const botonEliminar = idNum > 1 
            ? `<button class="delete-loot-btn" onclick="eliminarEntradaLoot(${idNum})">X</button>`
            : ''; 

        const entradaHTML = `
            <div id="entrada-${idNum}" class="loot-entry">
                <div class="entrada-header">
                    <h4 style="font-size: 1em;">Entrada ${idNum}</h4>
                    ${botonEliminar}
                </div>
                <div class="input-group loot-inputs">
                    <div>
                        <label for="dineroEntrada${idNum}">Objetos:</label>
                        <input type="text" id="dineroEntrada${idNum}" value="${loot.dinero.toLocaleString('es-ES')}" oninput="formatearNumeroYActualizarLoot(this, ${idNum}, 'dinero')">
                    </div>
                    <div>
                        <label for="silverEntrada${idNum}">Silver:</label>
                        <input type="text" id="silverEntrada${idNum}" value="${loot.silver.toLocaleString('es-ES')}" oninput="formatearNumeroYActualizarLoot(this, ${idNum}, 'silver')">
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', entradaHTML);
    });
}

function formatearNumeroYActualizarLoot(input, idNum, tipo) {
    const valorLimpio = limpiarFormato(input.value);
    input.value = valorLimpio.toLocaleString('es-ES');
    
    if (entradasLoot[idNum]) {
        entradasLoot[idNum][tipo] = valorLimpio;
    }
    
    generarReporteCompleto();
}


function añadirOtraEntrada() {
    if (Object.keys(entradasLoot).length >= 4) {
        alert("El límite de 4 entradas ha sido alcanzado.");
        return;
    }
    
    let nextId = 1;
    while(entradasLoot[nextId]) {
        nextId++;
    }

    entradasLoot[nextId] = { dinero: 0, silver: 0 };
    dibujarEntradasLoot();
    generarReporteCompleto();
}

function eliminarEntradaLoot(idNum) {
    if (idNum === 1) {
        alert("La Entrada 1 no puede ser eliminada.");
        return;
    }
    
    if (entradasLoot[idNum]) {
        delete entradasLoot[idNum];
        dibujarEntradasLoot();
        generarReporteCompleto();
    }
}
window.eliminarEntradaLoot = eliminarEntradaLoot;

function toggleReparacionPanel() {
    const panel = document.getElementById('reparacion-panel');
    const btn = document.getElementById('btnToggleReparacion');
    
    reparacionActiva = !reparacionActiva;
    
    if (reparacionActiva) {
        panel.style.display = 'block';
        btn.style.backgroundColor = 'var(--color-exito)';
        btn.innerText = '🛠️ Aplicar Reparación (ON)';
        document.getElementById('costoReparacion').value = (limpiarFormato(document.getElementById('costoReparacion').value) || 0).toLocaleString('es-ES');
    } else {
        panel.style.display = 'none';
        btn.style.backgroundColor = '#6a6a6a';
        btn.innerText = '🛠️ Aplicar Reparación (OFF)';
    }

    generarReporteCompleto();
}
window.toggleReparacionPanel = toggleReparacionPanel;

function resetearTodo() {
    // Resetear formulario principal
    document.getElementById('nombreParticipante').value = '';
    if (document.getElementById('nombreCofre')) document.getElementById('nombreCofre').value = '';
    
    // Resetear entradas de loot
    entradasLoot = { 1: { dinero: 0, silver: 0 } };
    dibujarEntradasLoot();

    // Resetear panel de reparación (ocultar)
    reparacionActiva = false;
    document.getElementById('reparacion-panel').style.display = 'none';
    document.getElementById('btnToggleReparacion').style.backgroundColor = '#6a6a6a';
    document.getElementById('btnToggleReparacion').innerText = '🛠️ Aplicar Reparación (OFF)';
    document.getElementById('costoReparacion').value = 0; 
    
    // Resetear botones de alternancia a sus valores por defecto
    document.getElementById('tipoIsla').checked = true;
    document.querySelector('label[for="tipoIsla"]').classList.add('active');
    document.querySelector('label[for="tipoHo"]').classList.remove('active');

    document.getElementById('descuentoSilver').checked = true;
    document.querySelector('label[for="descuentoSilver"]').classList.add('active');
    document.querySelector('label[for="descuentoObjetos"]').classList.remove('active');

    // Resetear participantes y resultados
    participantes = [];
    localStorage.removeItem('currentParticipants');
    
    if (document.getElementById('listaParticipantes')) document.getElementById('listaParticipantes').innerHTML = '<li>No hay participantes.</li>';
    if (document.getElementById('resultados')) document.getElementById('resultados').innerHTML = '<h4>Resultados en Vivo</h4><p>Ingresa los datos para ver el reparto.</p>';
}
window.resetearTodo = resetearTodo;

function formatearNumero(input) {
    const valorSinFormato = input.value.replace(/[^\d]/g, '');
    const numero = Number(valorSinFormato) || 0;
    input.value = numero.toLocaleString('es-ES');
    generarReporteCompleto();
}

function limpiarFormato(valor) {
    return Number(String(valor).replace(/[^\d]/g, '')) || 0;
}

function generarReporteCompleto() {
    if (!document.getElementById('resultados')) return;

    if (participantes.length === 0) {
        document.getElementById('resultados').innerHTML = '<h4>Resultados en Vivo</h4><p>Agrega al menos un participante para ver el reparto.</p>';
        return;
    }
    
    const costoReparacionInput = document.getElementById('costoReparacion');
    const activarReparacion = reparacionActiva;
    const costoReparacion = costoReparacionInput ? limpiarFormato(costoReparacionInput.value) : 0;
    const tipoDescuento = document.querySelector('input[name="descuentoReparacion"]:checked')?.value || 'silver';
    
    let totalDineroOriginal = 0;
    let totalSilverOriginal = 0;

    Object.values(entradasLoot).forEach(loot => {
        totalDineroOriginal += loot.dinero;
        totalSilverOriginal += loot.silver;
    });

    let totalSilverDistribuible = totalSilverOriginal;
    let totalDineroDistribuible = totalDineroOriginal;
    let descuentoAplicado = 0;

    if (activarReparacion && costoReparacion > 0) {
        descuentoAplicado = costoReparacion;

        if (tipoDescuento === 'silver') {
            totalSilverDistribuible = totalSilverOriginal - descuentoAplicado;
            if (totalSilverDistribuible < 0) totalSilverDistribuible = 0;
        } else if (tipoDescuento === 'objetos') {
            totalDineroDistribuible = totalDineroOriginal - descuentoAplicado;
            if (totalDineroDistribuible < 0) totalDineroDistribuible = 0;
        }
    }

    const participantesTotales = participantes.filter(p => p.entradas.entrada1 || p.entradas.entrada2 || p.entradas.entrada3 || p.entradas.entrada4).length;
    
    const silverPorParte = participantesTotales > 0 ? Math.floor(totalSilverDistribuible / participantesTotales) : 0;
    const dineroPorParte = participantesTotales > 0 ? Math.floor(totalDineroDistribuible / participantesTotales) : 0;
    
    const participantesActivos = participantes.filter(p => p.entradas.entrada1 || p.entradas.entrada2 || p.entradas.entrada3 || p.entradas.entrada4);

    const resultadosDiv = document.getElementById('resultados');
    let resultadosHTML = '<h4>Resultados en Vivo</h4>';
    
    if (descuentoAplicado > 0) {
        resultadosHTML += `<p style="color: var(--color-error);">🛠️ Coste de Reparación: ${descuentoAplicado.toLocaleString('es-ES')} (${tipoDescuento === 'silver' ? 'Silver' : 'Objetos'})</p>`;
    }
    
    resultadosHTML += `<p><strong>Loot Objetos a Repartir:</strong> ${totalDineroDistribuible.toLocaleString('es-ES')}</p>`;
    resultadosHTML += `<p><strong>Loot Silver a Repartir:</strong> ${totalSilverDistribuible.toLocaleString('es-ES')}</p>`;
    
    if (participantesTotales > 0) {
        resultadosHTML += '<h5 style="margin-top: 10px; font-size: 0.9em;">Botín Individual (estimado):</h5>';
        resultadosHTML += '<ul style="list-style-type: none; padding: 0; margin-top: 3px; max-height: 100px; overflow-y: auto;">';
        
        participantesActivos.forEach(p => {
            const parteFinalSilver = silverPorParte; 
            const parteFinalDinero = dineroPorParte; 

            resultadosHTML += `<li style="margin-bottom: 2px; font-size: 0.8em;">${p.nombre}: ${parteFinalDinero.toLocaleString('es-ES')} obj, ${parteFinalSilver.toLocaleString('es-ES')} silv.</li>`;
        });

        resultadosHTML += `</ul>`;
    }

    resultadosDiv.innerHTML = resultadosHTML;
}

function generarReporteData() {
    const nombreCofreInput = document.getElementById('nombreCofre');
    
    if (!nombreCofreInput.value.trim()) {
        alert("El Nombre de Cofre/Actividad es obligatorio.");
        nombreCofreInput.focus();
        return null;
    }
    
    if (participantes.length === 0) {
        alert("Por favor, agrega al menos un participante.");
        return null;
    }

    let totalDineroOriginal = 0;
    let totalSilverOriginal = 0;
    Object.values(entradasLoot).forEach(loot => {
        totalDineroOriginal += loot.dinero;
        totalSilverOriginal += loot.silver;
    });
    
    const activarReparacion = reparacionActiva;
    const costoReparacion = limpiarFormato(document.getElementById('costoReparacion').value); 
    const tipoDescuento = document.querySelector('input[name="descuentoReparacion"]:checked')?.value || 'silver';

    let totalSilverDistribuible = totalSilverOriginal;
    let totalDineroDistribuible = totalDineroOriginal;
    let descuentoAplicado = 0;
    
    if (activarReparacion && costoReparacion > 0) {
        descuentoAplicado = costoReparacion;

        if (tipoDescuento === 'silver') {
            totalSilverDistribuible = totalSilverOriginal - descuentoAplicado;
            if (totalSilverDistribuible < 0) totalSilverDistribuible = 0;
        } else if (tipoDescuento === 'objetos') {
            totalDineroDistribuible = totalDineroOriginal - descuentoAplicado;
            if (totalDineroDistribuible < 0) totalDineroDistribuible = 0;
        }
    }
    
    if (totalDineroOriginal === 0 && totalSilverOriginal === 0) {
        alert("Por favor, ingresa el botín en al menos una entrada.");
        return null;
    }

    const participantesActivos = participantes.filter(p => p.entradas.entrada1 || p.entradas.entrada2 || p.entradas.entrada3 || p.entradas.entrada4);
    const participantesTotales = participantesActivos.length;
    
    const partePorJugadorDinero = participantesTotales > 0 ? Math.floor(totalDineroDistribuible / participantesTotales) : 0;
    const partePorJugadorSilver = participantesTotales > 0 ? Math.floor(totalSilverDistribuible / participantesTotales) : 0;
    
    const ubicacionesCofres = JSON.parse(localStorage.getItem('ubicacionesCofres')) || [];

    const participantesFinal = participantes.map(p => {
        const pCopy = { ...p };
        
        if (p.entradas.entrada1 || p.entradas.entrada2 || p.entradas.entrada3 || p.entradas.entrada4) {
            pCopy.botin = { dinero: partePorJugadorDinero, silver: partePorJugadorSilver };
        } else {
            pCopy.botin = { dinero: 0, silver: 0 };
        }
        
        const cofre = ubicacionesCofres.find(item => item.jugador.toLowerCase() === p.nombre.toLowerCase());
        pCopy.ubicacionCofre = cofre ? `Cofre #${cofre.numeroCofre}` : 'No Registrada ❓'; 
        pCopy.numeroCofre = cofre ? cofre.numeroCofre : null; 
        
        if (typeof pCopy.cofreStatus === 'undefined') {
             pCopy.cofreStatus = 0; 
        }
        if (typeof pCopy.pagado === 'undefined') {
             pCopy.pagado = false; 
        }

        return pCopy;
    });

    const tipoCofre = document.querySelector('input[name="tipoCofre"]:checked').value;

    const reporteFinal = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-ES'),
        tipo: tipoCofre, 
        participantes: participantesFinal, 
        reporteData: {
            nombreCofre: nombreCofreInput.value.trim(),
            totalDineroOriginal: totalDineroOriginal,
            totalSilverOriginal: totalSilverOriginal,
            costoReparacion: descuentoAplicado, 
            tipoDescuento: descuentoAplicado > 0 ? tipoDescuento : null,
            totalDineroDistribuible: totalDineroDistribuible,
            totalSilverDistribuible: totalSilverDistribuible
        }
    };
    
    return reporteFinal;
}
window.generarReporteData = generarReporteData;


function guardarReporte() {
    const reporteFinal = generarReporteData();
    if (!reporteFinal) return; 

    // Guardar en historial y como reporte actual
    let historial = JSON.parse(localStorage.getItem('reporteHistory')) || [];
    historial.unshift(reporteFinal);
    localStorage.setItem('reporteHistory', JSON.stringify(historial));
    localStorage.setItem('currentReport', JSON.stringify(reporteFinal));

    // ABRIR LA NUEVA PESTAÑA CON EL ARCHIVO reporte.html
    const windowFeatures = 'width=800,height=700,scrollbars=yes';
    if (window.reporteAbierto && !window.reporteAbierto.closed) {
        window.reporteAbierto.location.href = 'reporte.html';
        window.reporteAbierto.focus();
    } else {
        window.reporteAbierto = window.open('reporte.html', '_blank', windowFeatures);
        if (!window.reporteAbierto) {
            alert("El navegador bloqueó la ventana emergente. Por favor, permítela para ver el reporte.");
        }
    }
}
window.guardarReporte = guardarReporte;

// ==========================================================
// FUNCIONES DE ACTUALIZACIÓN (Reporte llama a estas funciones)
// ==========================================================

function actualizarEstadoPagoEnReporte(participanteNombre, pagadoStatus) {
    const index = participantes.findIndex(p => p.nombre === participanteNombre);

    if (index !== -1) {
        participantes[index].pagado = pagadoStatus;
        guardarParticipantes();
        // Mantiene la lista de participantes principal sincronizada
        actualizarListaParticipantes(); 
        
        // Regenera la data para que el reporte.js pueda recargar la ventana con la info correcta
        const reporteActualizado = generarReporteData();
        localStorage.setItem('currentReport', JSON.stringify(reporteActualizado));
        
        return true; // Éxito en la actualización
    } else {
        console.error("Participante no encontrado:", participanteNombre);
        return false;
    }
}
window.actualizarEstadoPagoEnReporte = actualizarEstadoPagoEnReporte; 

function actualizarEstadoCofreEnReporte(participanteNombre, nuevoStatus) {
    const index = participantes.findIndex(p => p.nombre === participanteNombre);

    if (index !== -1) {
        participantes[index].cofreStatus = nuevoStatus;
        guardarParticipantes();
        // Mantiene la lista de participantes principal sincronizada
        actualizarListaParticipantes(); 
        
        // Regenera la data para que el reporte.js pueda recargar la ventana con la info correcta
        const reporteActualizado = generarReporteData();
        localStorage.setItem('currentReport', JSON.stringify(reporteActualizado));

        return true; // Éxito en la actualización
    } else {
        console.error("Participante no encontrado:", participanteNombre);
        return false;
    }
}
window.actualizarEstadoCofreEnReporte = actualizarEstadoCofreEnReporte; 


function generarTextoDiscordANSI(reporte) {
    const data = reporte.reporteData;
    const participantesActivos = reporte.participantes.filter(p => p.botin.silver > 0 || p.botin.dinero > 0);
    const totalJugadores = participantesActivos.length;
    
    const silverPorJugador = participantesActivos[0]?.botin.silver.toLocaleString('es-ES') || 0;
    const objetosPorJugador = participantesActivos[0]?.botin.dinero.toLocaleString('es-ES') || 0;

    let reparacionInfo = "";
    if (data.costoReparacion > 0) {
        reparacionInfo = `[2;31m║ 🛠️ REPARACIÓN DEDUCIDA: ${data.costoReparacion.toLocaleString('es-ES')} ${data.tipoDescuento.toUpperCase()}[0m`;
    }

    let reporteDiscord = `
\`\`\`ansi
[2;33m┏━━━━━━━━━━━━━━━━━━━[ HIYOKO LOOT SPLIT ]━━━━━━━━━━━━━━━━━━━┓[0m
[2;36m║ 📅 FECHA:[0m ${reporte.fecha}
[2;36m║ 🗺️ ACTIVIDAD:[0m ${data.nombreCofre} (Tipo: ${reporte.tipo})
${reparacionInfo ? reparacionInfo : '[2;37m║ 🛠️ SIN REPARACIONES APLICADAS[0m'}
[2;33m┣━━━━━━━━━━━━━━━━━━━[ RESUMEN DE REPARTO (${totalJugadores} JUGADORES) ]━━━━━━━━━━━━━━━━━━━┫[0m
[2;32m║ 💰 TOTAL SILVER:[0m ${data.totalSilverDistribuible.toLocaleString('es-ES')}
[2;32m║ 📦 TOTAL OBJETOS:[0m ${data.totalDineroDistribuible.toLocaleString('es-ES')}
[2;33m┣━━━━━━━━━━━━━━━━━━━━━━━━[ PAGO INDIVIDUAL ]━━━━━━━━━━━━━━━━━━━━━━━━━┫[0m
[2;32m║ 🎁 LOOT POR JUGADOR:[0m 
[2;32m║    - Silver:[0m ${silverPorJugador}
[2;32m║    - Objetos:[0m ${objetosPorJugador}
[2;33m┣━━━━━━━━━━━━━━━━━━━━━━━━━[ JUGADORES ]━━━━━━━━━━━━━━━━━━━━━━━━━━━┫[0m
`;

    participantesActivos.forEach(p => {
        reporteDiscord += `[2;37m║  - ${p.nombre}[0m (Cofre #${p.numeroCofre ? p.numeroCofre : '?'})\n`;
    });
    
    reporteDiscord += `[2;33m┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛[0m
\`\`\``;

    return reporteDiscord.trim();
}
window.generarTextoDiscordANSI = generarTextoDiscordANSI; 


function toggleMode() {
    const body = document.body;
    const modeIcon = document.getElementById('mode-icon');
    if (body.classList.contains('pc-mode')) {
        body.classList.remove('pc-mode');
        body.classList.add('phone-mode');
        modeIcon.innerText = '💻';
    } else {
        body.classList.remove('phone-mode');
        body.classList.add('pc-mode');
        modeIcon.innerText = '📱';
    }
}

function abrirHistorialReportes() {
    window.open('historial.html', '_blank');
}
window.abrirHistorialReportes = abrirHistorialReportes;

function dibujarImagenReferencialUbicacion() {
    const contenedor = document.querySelector('#ubicacionModal .referencia-visual');
    if (!contenedor) return;

    const imagenReferencia = 'cofres_referencia_unica.jpg'; 
    const html = `
        <p style="text-align: center; margin-top: 10px; font-weight: bold;">Referencia de Ubicación de Cofres</p>
        <img src="${imagenReferencia}" 
             alt="Distribución de cofres de gremio numerados" 
             onerror="this.onerror=null;this.src='placeholder.png';"
             style="max-width: 100%; height: auto; border-radius: 5-5px; margin-top: 10px; border: 1px solid var(--color-separador);">
    `;
    
    contenedor.innerHTML = html; 
}
window.dibujarImagenReferencialUbicacion = dibujarImagenReferencialUbicacion;

function openUbicacionModal() {
    const modal = document.getElementById('ubicacionModal');
    if (modal) {
        modal.style.display = 'block';
        dibujarImagenReferencialUbicacion();
        actualizarListaUbicaciones(); 
    }
}
window.openUbicacionModal = openUbicacionModal;

function closeUbicacionModal() {
    const modal = document.getElementById('ubicacionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
window.closeUbicacionModal = closeUbicacionModal;

function actualizarListaUbicaciones() {
    const lista = document.getElementById('listaUbicacionesGuardadas');
    if (!lista) return;

    let ubicacionesCofres = JSON.parse(localStorage.getItem('ubicacionesCofres')) || [];
    
    ubicacionesCofres.sort((a, b) => {
        if (a.numeroCofre !== b.numeroCofre) {
            return a.numeroCofre - b.numeroCofre;
        }
        return a.jugador.localeCompare(b.jugador);
    });
    
    lista.innerHTML = ubicacionesCofres.map((item, index) => `
        <li>
            <span class="cofre-tag" style="margin-right: 15px;">📦 #${item.numeroCofre}</span>
            <span style="flex-grow: 1;">${item.jugador}</span>
            <button class="eliminar-btn" onclick="eliminarUbicacionCofrePorJugador('${item.jugador}')">X</button>
        </li>
    `).join('');
    
    if (ubicacionesCofres.length === 0) {
        lista.innerHTML = '<li style="justify-content: center;">No hay ubicaciones registradas.</li>';
    }
}
window.actualizarListaUbicaciones = actualizarListaUbicaciones;


function guardarUbicacionCofre() {
    const jugadorInput = document.getElementById('jugadorUbicacion');
    const cofreInput = document.getElementById('numeroCofreUbicacion');
    
    const jugador = limpiarYNormalizarNombre(jugadorInput.value);
    const numeroCofre = parseInt(cofreInput.value);

    if (!jugador || !numeroCofre || isNaN(numeroCofre)) {
        alert("Debes ingresar un nombre de jugador y un número de cofre válido (1-9).");
        return;
    }
    
    let ubicacionesCofres = JSON.parse(localStorage.getItem('ubicacionesCofres')) || [];
    
    const index = ubicacionesCofres.findIndex(item => item.jugador.toLowerCase() === jugador.toLowerCase());
    
    if (index !== -1) {
        ubicacionesCofres[index] = { jugador, numeroCofre };
    } else {
        ubicacionesCofres.push({ jugador, numeroCofre });
    }
    
    localStorage.setItem('ubicacionesCofres', JSON.stringify(ubicacionesCofres));
    
    jugadorInput.value = '';
    cofreInput.value = '';
    
    actualizarListaUbicaciones();
    actualizarListaParticipantes(); 
}
window.guardarUbicacionCofre = guardarUbicacionCofre;

function eliminarUbicacionCofrePorJugador(jugadorNombre) {
    let ubicacionesCofres = JSON.parse(localStorage.getItem('ubicacionesCofres')) || [];
    
    ubicacionesCofres = ubicacionesCofres.filter(item => item.jugador.toLowerCase() !== jugadorNombre.toLowerCase());
    
    localStorage.setItem('ubicacionesCofres', JSON.stringify(ubicacionesCofres));
    actualizarListaUbicaciones();
    actualizarListaParticipantes();
}
window.eliminarUbicacionCofrePorJugador = eliminarUbicacionCofrePorJugador;

window.agregarParticipante = agregarParticipante;
window.actualizarDatalist = actualizarDatalist;