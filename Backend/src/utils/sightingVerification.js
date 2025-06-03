const { Op } = require('sequelize');
const db = require('../models');
const User = db.User;
const UserStatus = db.UserStatus;
const BlacklistedToken = db.BlacklistedToken;

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

// Check if time difference is suspicious (less than 3 minutes)
function isSuspiciousTimeDifference(time1, time2) {
    const diffInMinutes = Math.abs(time1 - time2) / (1000 * 60);
    return diffInMinutes < 3;
}

// Check if enough time has passed for long distance markers (1.5 hours)
function hasEnoughTimeForLongDistance(time1, time2) {
    const diffInMinutes = Math.abs(time1 - time2) / (1000 * 60);
    return diffInMinutes >= 90; // 1.5 horas = 90 minutos
}

// Check for suspicious sightings
async function checkSuspiciousSightings(sighting) {
    try {
        console.log('Checking suspicious sightings for:', {
            id: sighting.id,
            ip: sighting.ip_address,
            usuario_id: sighting.usuario_id,
            fecha: sighting.fecha_avistamiento
        });

        // Get recent sightings from the same IP address
        const recentSightings = await db.Sighting.findAll({
            where: {
                ip_address: sighting.ip_address,
                fecha_avistamiento: {
                    [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                },
                id: {
                    [Op.ne]: sighting.id // Exclude current sighting
                }
            },
            order: [['fecha_avistamiento', 'ASC']]
        });

        console.log('Found recent sightings:', recentSightings.length);

        // Contador de avistamientos sospechosos
        let suspiciousCount = 0;
        const maxSuspiciousAllowed = 3;

        for (const prevSighting of recentSightings) {
            const distance = calculateDistance(
                prevSighting.latitud,
                prevSighting.longitud,
                sighting.latitud,
                sighting.longitud
            );

            const timeDiff = isSuspiciousTimeDifference(
                new Date(prevSighting.fecha_avistamiento),
                new Date(sighting.fecha_avistamiento)
            );

            const hasEnoughTime = hasEnoughTimeForLongDistance(
                new Date(prevSighting.fecha_avistamiento),
                new Date(sighting.fecha_avistamiento)
            );

            console.log('Comparing with previous sighting:', {
                distance,
                timeDiff,
                hasEnoughTime,
                prevSightingId: prevSighting.id,
                prevSightingDate: prevSighting.fecha_avistamiento
            });

            // Nueva lógica de detección de actividad sospechosa
            let isSuspicious = false;

            // 1. Verificar si hay múltiples marcadores en 3 minutos
            if (timeDiff) {
                isSuspicious = true;
            }

            // 2. Verificar si los marcadores están a más de 50km de distancia
            // y no ha pasado suficiente tiempo (1.5 horas)
            if (distance > 50 && !hasEnoughTime) {
                isSuspicious = true;
                console.log('Suspicious: Marker too far without enough time passed');
            }

            // 3. Verificar si hay un patrón de actividad inusual
            // (más de 5 marcadores en la última hora)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentSightingsCount = recentSightings.filter(s => 
                new Date(s.fecha_avistamiento) > oneHourAgo
            ).length;
            
            if (recentSightingsCount > 5) {
                isSuspicious = true;
            }

            if (isSuspicious) {
                suspiciousCount++;
                console.log(`Suspicious activity count: ${suspiciousCount}`);
            }

            // Solo bloquear si se supera el límite de avistamientos sospechosos
            if (suspiciousCount >= maxSuspiciousAllowed) {
                console.log('Suspicious activity threshold exceeded!');
                
                // Get blocked status ID
                const blockedStatus = await UserStatus.findOne({ where: { status: 'blocked' } });
                if (!blockedStatus) {
                    console.error('Blocked status not found in UserStatus table');
                    return false;
                }
                
                console.log('Updating user status to blocked:', {
                    userId: sighting.usuario_id,
                    blockedStatusId: blockedStatus.id
                });

                // Update user status to blocked
                const [updatedRows] = await User.update(
                    { 
                        status: blockedStatus.id,
                        status_updated_at: new Date(),
                        status_updated_by: null // System update
                    },
                    { 
                        where: { dni: sighting.usuario_id },
                        validate: false
                    }
                );

                console.log('User update result:', { updatedRows });

                // Invalidar todos los tokens activos del usuario
                const currentToken = sighting.token;
                if (currentToken) {
                    await BlacklistedToken.create({
                        token: currentToken,
                        reason: 'Suspicious activity detected',
                        created_at: new Date()
                    });
                    console.log('Token invalidated due to suspicious activity');
                }

                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking suspicious sightings:', error);
        return false;
    }
}

module.exports = {
    checkSuspiciousSightings
};