const refreshTokens = new Set(); // TODO: Reemplazar con base de datos o Redis

// Funciones de gestión de Refresh Tokens
const saveRefreshToken = (token) => refreshTokens.add(token);
const deleteRefreshToken = (token) => refreshTokens.delete(token);
const existsRefreshToken = (token) => refreshTokens.has(token);

//funcion para romper el refresh token


module.exports = {
    saveRefreshToken,
    deleteRefreshToken,
    existsRefreshToken
};