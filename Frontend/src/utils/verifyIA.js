import { customFetch } from './auth.js';
import { retrieveUserProfile } from './profile.js';

export function initVerifyIA() {
    console.log('Inicializando verificación IA...'); // Debug log

    const verifyButton = document.getElementById('verifyIAButton');
    if (!verifyButton) {
        console.error('Botón de verificación IA no encontrado');
        return;
    }

    const userData = retrieveUserProfile();
    const userRank = userData?.user?.userRank;

    // Verificar si el usuario tiene uno de los roles permitidos
    if (['JEFE DE DETECCION', 'SUPERVISOR', 'ADMINDEVELOPER'].includes(userRank)) {
        verifyButton.style.display = 'flex';
    } else {
        verifyButton.style.display = 'none';
    }

    verifyButton.addEventListener('click', async () => {
        // Verificar nuevamente el rol antes de ejecutar la verificación
        const currentUserData = retrieveUserProfile();
        const currentRank = currentUserData?.user?.userRank;
        
        if (!['JEFE DE DETECCION', 'SUPERVISOR', 'ADMINDEVELOPER'].includes(currentRank)) {
            console.log('Usuario no autorizado para ejecutar la verificación. Rol actual:', currentRank);
            alert('No tienes permisos para ejecutar la verificación IA');
            return;
        }

        console.log('Iniciando verificación IA...'); // Debug log
        try {
            verifyButton.disabled = true;
            verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

            console.log('Enviando petición de verificación...'); // Debug log
            const response = await customFetch('/api/sightings/verificar-ia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('Respuesta recibida:', response.status); // Debug log

            if (response.ok) {
                const data = await response.json();
                console.log('Verificación exitosa:', data); // Debug log
                alert('Verificación IA ejecutada correctamente');
                // Recargar los marcadores en el mapa
                window.dispatchEvent(new CustomEvent('refreshMarkers'));
            } else {
                const data = await response.json();
                console.error('Error en la respuesta:', data); // Debug log
                throw new Error(data.message || 'Error al ejecutar la verificación IA');
            }
        } catch (error) {
            console.error('Error en verificación IA:', error); // Debug log
            alert(error.message || 'Error al ejecutar la verificación IA');
        } finally {
            verifyButton.disabled = false;
            verifyButton.innerHTML = '<i class="fas fa-robot"></i> Verificación IA';
        }
    });
} 