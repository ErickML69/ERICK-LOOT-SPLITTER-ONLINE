let ubicacionesCofres = [];

// Intenta recuperar ubicaciones, si falla o el formato es incorrecto, lo inicializa.
function loadUbicaciones() {
    try {
        const stored = localStorage.getItem('ubicacionesCofres');
        ubicacionesCofres = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(ubicacionesCofres)) ubicacionesCofres = []; 
    } catch (e) {
        console.error("Error al cargar ubicaciones de cofres, reiniciando lista.", e);
        ubicacionesCofres = [];
        localStorage.removeItem('ubicacionesCofres');
    }
}

function saveUbicaciones() {
    localStorage.setItem('ubicacionesCofres', JSON.stringify(ubicacionesCofres));
}

document.addEventListener('DOMContentLoaded', () => {
    loadUbicaciones();
    if (document.getElementById('cofresModal')) {
        mostrarUbicacionesCofre();
    }
});

function agregarUbicacionCofre() {
    const jugadorInput = document.getElementById('jugadorCofre');
    const numeroCofreInput = document.getElementById('numeroCofre');
    
    const jugador = jugadorInput.value.trim();
    const numeroCofre = parseInt(numeroCofreInput.value, 10);

    if (!jugador || isNaN(numeroCofre) || numeroCofre < 1 || numeroCofre > 70) {
        alert("Por favor, ingresa un nombre de jugador y un número de cofre válido (1-70).");
        return;
    }
    
    const jugadorNormalizado = jugador.charAt(0).toUpperCase() + jugador.slice(1).toLowerCase();
    
    // 1. Añadir/Actualizar la lista global de jugadores
    let jugadoresGlobal = JSON.parse(localStorage.getItem('jugadoresGlobal')) || [];
    if (!jugadoresGlobal.map(j => j.toLowerCase()).includes(jugadorNormalizado.toLowerCase())) {
        jugadoresGlobal.push(jugadorNormalizado); 
        localStorage.setItem('jugadoresGlobal', JSON.stringify(jugadoresGlobal));
        if (typeof actualizarDatalist === 'function') {
            window.actualizarDatalist(); 
        }
    }

    // 2. Actualizar la ubicación del cofre
    const index = ubicacionesCofres.findIndex(item => item.jugador.toLowerCase() === jugadorNormalizado.toLowerCase());
    
    if (index !== -1) {
        ubicacionesCofres[index].numeroCofre = numeroCofre;
    } else {
        ubicacionesCofres.push({ jugador: jugadorNormalizado, numeroCofre: numeroCofre });
    }

    // 3. Guardar y Ordenar por número de cofre
    ubicacionesCofres.sort((a, b) => a.numeroCofre - b.numeroCofre);
    saveUbicaciones();
    
    // 4. Actualizar lista de participantes si estamos en index.html
    if (typeof window.actualizarListaParticipantes === 'function') {
        window.initApp(); // Recargar participantes con la nueva data de cofre
        window.actualizarListaParticipantes(); 
    }
    
    jugadorInput.value = '';
    numeroCofreInput.value = '';
    
    mostrarUbicacionesCofre();
    alert(`Ubicación de Cofre #${numeroCofre} guardada para ${jugadorNormalizado}.`);
}

function eliminarUbicacion(jugador) {
    if (confirm(`¿Estás seguro de que deseas eliminar la ubicación del cofre para ${jugador}?`)) {
        ubicacionesCofres = ubicacionesCofres.filter(item => item.jugador !== jugador);
        saveUbicaciones();
        mostrarUbicacionesCofre();
        
        // Actualizar lista de participantes si estamos en index.html
        if (typeof window.actualizarListaParticipantes === 'function') {
            window.initApp();
            window.actualizarListaParticipantes(); 
        }
    }
}

function mostrarUbicacionesCofre() {
    const lista = document.getElementById('ubicaciones-list');
    if (!lista) return;

    lista.innerHTML = '';
    
    const filtro = document.getElementById('filtroJugador')?.value.toLowerCase() || '';
    
    const ubicacionesFiltradas = ubicacionesCofres.filter(item => 
        item.jugador.toLowerCase().includes(filtro) || item.numeroCofre.toString().includes(filtro)
    );

    ubicacionesFiltradas.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>📦 Cofre #${item.numeroCofre}: <strong>${item.jugador}</strong></span>
            <button class="eliminar-btn" onclick="eliminarUbicacion('${item.jugador}')">X</button>
        `;
        li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 5px; background-color: var(--color-destacado-gris); border-radius: 4px;';
        lista.appendChild(li);
    });
}

function actualizarDatalistCofres() {
    const datalistCofre = document.getElementById('lista-jugadores-cofre');
    if (datalistCofre) {
        const jugadoresGlobal = JSON.parse(localStorage.getItem('jugadoresGlobal')) || [];
        datalistCofre.innerHTML = '';
        jugadoresGlobal.forEach(jugador => {
            const option = document.createElement('option');
            option.value = jugador;
            datalistCofre.appendChild(option);
        });
    }
}

window.agregarUbicacionCofre = agregarUbicacionCofre;
window.eliminarUbicacion = eliminarUbicacion;
window.mostrarUbicacionesCofre = mostrarUbicacionesCofre;
window.actualizarDatalistCofres = actualizarDatalistCofres;
window.loadUbicaciones = loadUbicaciones; // Exportar para uso en script.js