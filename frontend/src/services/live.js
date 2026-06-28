import { io } from "socket.io-client";
import config from "../config";

function socketError(response) {
  const error = new Error(response?.error?.message || "The live command failed.");
  error.code = response?.error?.code || "SOCKET_ERROR";
  error.details = response?.error?.details || {};
  return error;
}

export default class LiveClient {
  constructor(token) {
    this.socket = io(config.socketUrl, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: false,
    });
  }

  connect() {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Live connection timed out.")), config.socketTimeoutMs);
      this.socket.once("connect", () => {
        window.clearTimeout(timeout);
        resolve();
      });
      this.socket.once("connect_error", (error) => {
        window.clearTimeout(timeout);
        reject(error.data ? socketError(error.data) : error);
      });
      this.socket.connect();
    });
  }

  on(eventName, listener) {
    this.socket.on(eventName, listener);
  }

  command(eventName, payload = {}) {
    if (!this.socket.connected) return Promise.reject(new Error("Live play is disconnected."));
    return new Promise((resolve, reject) => {
      this.socket.timeout(config.socketTimeoutMs).emit(eventName, payload, (timeoutError, response) => {
        if (timeoutError) return reject(new Error("The live command timed out."));
        if (!response?.success) return reject(socketError(response));
        resolve(response.data);
      });
    });
  }

  disconnect() {
    this.socket.disconnect();
  }
}
