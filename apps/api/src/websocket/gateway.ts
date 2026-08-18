import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { redisSub } from '../config/db';

let ioInstance: SocketIOServer | null = null;

export function setupWebSocketGateway(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  ioInstance = io;
  console.log('⚡ WebSocket Gateway Server initialized');

  io.on('connection', (socket) => {
    socket.on('subscribe', (room: string) => {
      socket.join(room);
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
    });
  });

  const channelsToSubscribe = ['market:*', 'kline:*', 'ticker:*', 'trades:*', 'orderbook:*', 'funding:*'];
  channelsToSubscribe.forEach((pattern) => {
    redisSub.psubscribe(pattern, (err) => {
      if (err) console.error(`Failed to psubscribe ${pattern}:`, err);
      else console.log(`📡 Subscribed to Redis channel pattern: ${pattern}`);
    });
  });

  redisSub.on('pmessage', (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message);
      if (channel === 'funding:update') {
        io.emit('funding:update', data);
      } else {
        io.to(channel).emit('update', { channel, data });
      }
    } catch (e) {
      io.to(channel).emit('update', { channel, data: message });
    }
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
