import { verifyAccessToken } from '/utils/auth.js';

class SocketClient {
    static instance;
  
    constructor(url, options = {}) {
      if (!url) {
        throw new Error("URL is required to initialize SocketClient");
      }
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
          console.error("No access token available to initialize SocketClient.");
          return false; // Indicate initialization failure
      }

      this.options.auth = {
          token: accessToken
      };

      try {
        this.socket = io(this.url.replace('ws:', 'wss:'), this.options); // Intentar con wss primero
        await this._setupSocketEvents();
      } catch (error) {
        console.warn("Failed to connect with wss, trying ws...");
        this.socket = io(this.url.replace('wss:', 'ws:'), this.options); // Intentar con ws si wss falla
        await this._setupSocketEvents();
      }

      return true; // Indicate successful initialization
    }

    async _setupSocketEvents() {
      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.trigger('connect');
          resolve();
        });
        this.socket.on('disconnect', (reason) => {
          this.isConnected = false;
          this.trigger('disconnect', reason);
        });
        this.socket.on('error', (error) => {
          this.trigger('error', error);
          reject(error);
        });
      });
    }
  
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
        this.socket.on(event, (data) => {
          this.listeners.get(event).forEach(cb => cb(data));
        });
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
      if (this.isConnected) {
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
      if (this.socket.connected) {
        this.socket.disconnect();
      }
    }

    connect() {
      if (this.socket && !this.socket.connected && !this.isConnected) { // Prevent double connection
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
  
  // Configuración global (opcional)
  let socketInstance = null;

  async function getSocketClient(url) {
      if (!socketInstance) {
          socketInstance = new SocketClient(url); // Pasar la URL completa como parámetro
          const isTokenValid = await verifyAccessToken(); // Esperar a que se verifique el token
          if (isTokenValid) {
              const initialized = await socketInstance.initialize(); // Inicializar y conectar solo si el token es válido
              if (!initialized) {
                  socketInstance = null; // Reset instance on initialization failure
                  console.error("SocketClient initialization failed after token verification.");
                  return null;
              }
              socketInstance.connect(); // Conectar manualmente después de la inicialización exitosa
          } else {
              socketInstance = null; // Reset instance if token is invalid
              console.error("Token verification failed, SocketClient not initialized.");
              return null;
          }
      }
      return socketInstance;
  }
  
  // Exportar la función para obtener la instancia del socket
  export default getSocketClient;