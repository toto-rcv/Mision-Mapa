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

class UserNotFoundError extends Error {
  constructor(message = 'Usuario no encontrado') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

class UserAlreadyDeletedError extends Error {
  constructor(message = 'Este usuario ya ha sido eliminado') {
    super(message);
    this.name = 'UserAlreadyDeletedError';
  }
}


module.exports = {
  SightingNotFoundError,
  InsufficientPermissionsError,
  SightingAlreadyDeletedError,
  UserNotFoundError,
  UserAlreadyDeletedError
};
