class SightingNotFoundError extends Error {
    constructor(message = 'Avistamiento no encontrado') {
      super(message);
      this.name = 'SightingNotFoundError';
    }
  }
  
  class InsufficientPermissionsError extends Error {
    constructor(message = 'No tienes permiso para realizar esta acción') {
      super(message);
      this.name = 'InsufficientPermissionsError';
    }
  }
  
  class SightingAlreadyDeletedError extends Error {
    constructor(message = 'Este avistamiento ya ha sido eliminado') {
      super(message);
      this.name = 'SightingAlreadyDeletedError';
    }
  }
  
  module.exports = {
    SightingNotFoundError,
    InsufficientPermissionsError,
    SightingAlreadyDeletedError
  };
  