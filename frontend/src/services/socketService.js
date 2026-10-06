import { io } from "socket.io-client";

class SocketService {
  constructor() {
    if (SocketService.instance) {
      return SocketService.instance;
    }
    this.socket = null;
    this.token = null;

    // Disconnect socket gracefully on page refresh / window close
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.disconnect();
      });
      window.addEventListener("pagehide", () => {
        this.disconnect();
      });
    }

    SocketService.instance = this;
  }

  /**
   * Initializes or returns the singleton socket connection for the user.
   * If an active socket exists, it is disconnected first before establishing a new one.
   */
  connect(token) {
    const API_BASE =
      import.meta.env.VITE_API_BASE_URI || "http://localhost:5000";

    // Singleton pattern check: Disconnect any active existing connection first
    if (this.socket) {
      console.log("[Singleton Socket] Disconnecting existing socket instance before connecting new session...");
      this.disconnect();
    }

    if (!token) {
      console.warn("[Singleton Socket] Token is required to connect socket.");
      return null;
    }

    this.token = token;
    this.socket = io(API_BASE, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.socket.on("force_disconnect", (data) => {
      console.warn("[Singleton Socket] Force disconnected by server:", data?.reason);
      this.disconnect();
    });

    return this.socket;
  }

  /**
   * Returns the current active singleton socket instance.
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Safely disconnects and cleans up the active singleton socket connection.
   */
  disconnect() {
    if (this.socket) {
      try {
        console.log("[Singleton Socket] Closing socket connection...");
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (err) {
        console.error("[Singleton Socket] Error during socket disconnect:", err);
      } finally {
        this.socket = null;
        this.token = null;
      }
    }
  }
}

const socketService = new SocketService();
export default socketService;
