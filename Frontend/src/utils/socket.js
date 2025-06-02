import { verifyAccessToken } from '/utils/auth.js';

class SocketClient {
    static instance;
  
    constructor(url, options = {}) {
      this.url = url;
      this.options = {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        autoConnect: false,
        transports: ['websocket'],
        ...options
      };
  
      this.socket = null;
      this.listeners = new Map();
      this.isConnected = false;
      
      if (SocketClient.instance) {
        return SocketClient.instance;
      }
      
      SocketClient.instance = this;
    }
  
    async initialize() {
      if (this.socket) {
          console.warn("Socket already initialized. Disconnecting and re-initializing.");
          this.disconnect();
      }

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
          console.log("No access token available. Socket initialization skipped.");
          return false;
      }

      try {
          const isTokenValid = await verifyAccessToken();
          if (!isTokenValid) {
              console.log("Token invalid or expired. Socket initialization skipped.");
              return false;
          }

          this.options.auth = {
              token: accessToken
          };

          this.socket = io(this.url, this.options);

          // Eventos base
          this.socket.on('connect', () => {
              this.isConnected = true;
              this.trigger('connect');
          });
          this.socket.on('disconnect', (reason) => {
              this.isConnected = false;
              this.trigger('disconnect', reason);
          });
          this.socket.on('error', (error) => this.trigger('error', error));

          return true;
      } catch (error) {
          console.error("Error initializing socket:", error);
          return false;
      }
    }
  
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
        if (this.socket) {
            this.socket.on(event, (data) => {
                this.listeners.get(event).forEach(cb => cb(data));
            });
        }
      }
      this.listeners.get(event).push(callback);
    }
  
    off(event, callback) {
      if (this.listeners.has(event)) {
        const filtered = this.listeners.get(event).filter(cb => cb !== callback);
        this.listeners.set(event, filtered);
      }
    }
  
    emit(event, data) {
      if (this.isConnected && this.socket) {
          this.socket.emit(event, data);
      } else {
          console.warn("Socket is not connected. Cannot emit event:", event);
      }
    }
  
    trigger(event, data) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).forEach(cb => cb(data));
      }
    }
  
    disconnect() {
      if (this.socket && this.socket.connected) {
        this.socket.disconnect();
      }
    }

    connect() {
      if (this.socket && !this.socket.connected && !this.isConnected) {
          this.socket.connect();
      } else if (!this.socket) {
          console.warn("Socket not initialized. Call initialize() first.");
      } else if (this.isConnected) {
          console.warn("Socket is already connected.");
      }
    }
  
    get id() {
        return this.socket?.id;
    }

    get connected() {
        return this.isConnected;
    }
}
  
// Configuración global
let socketInstance = null;

async function getSocketClient() {
    if (!socketInstance) {
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
        console.log('Creating new socket instance for:', baseUrl);
        
        socketInstance = new SocketClient(baseUrl, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: false,
            transports: ['websocket', 'polling'],
            forceNew: true,
            path: '/socket.io/',
            withCredentials: true,
            extraHeaders: {
                "Content-Type": "application/json"
            },
            upgrade: true,
            rememberUpgrade: true,
            rejectUnauthorized: false
        });
    }

    // Solo intentar inicializar si hay un token
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.log("No access token found. Socket initialization skipped.");
        return null;
    }

    // Si el socket no está inicializado, intentar inicializarlo
    if (!socketInstance.socket) {
        const initialized = await socketInstance.initialize();
        if (!initialized) {
            console.log("Socket initialization failed.");
            return null;
        }

        // Añadir indicador visual de estado de conexión
        socketInstance.on('connect', () => {
            console.log('Socket conectado');
            document.body.classList.add('socket-connected');
            document.body.classList.remove('socket-disconnected');
        });
        
        socketInstance.on('disconnect', (reason) => {
            console.log('Socket desconectado:', reason);
            document.body.classList.remove('socket-connected');
            document.body.classList.add('socket-disconnected');
        });
        
        socketInstance.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            document.body.classList.remove('socket-connected');
            document.body.classList.add('socket-disconnected');
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Intento de reconexión #${attemptNumber}`);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log(`Reconexión exitosa después de ${attemptNumber} intentos`);
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error('Error en reconexión:', error);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('Falló la reconexión después de todos los intentos');
        });

        // Intentar conectar después de un breve retraso
        setTimeout(() => {
            console.log('Intentando conectar socket...');
            socketInstance.connect();
        }, 1000);
    }

    return socketInstance;
}

export default getSocketClient;