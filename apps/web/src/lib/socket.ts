import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;

const getWsUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:4000';
};

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(getWsUrl(), {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('⚡ Socket.io Gateway Connected to Apex Exchange Engine');
      startHeartbeat(socket!);
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket.io Gateway Disconnected:', reason);
      stopHeartbeat();
    });
  }
  return socket;
};

function startHeartbeat(sock: Socket) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (sock && sock.connected) {
      sock.emit('ping', { time: Date.now() });
    }
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
