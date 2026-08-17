import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { redisSub } from '../config/db';

export function setupWebSocketGateway(server: HttpServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  console.log('⚡ WebSocket Gateway Server initialized');

  io.on('connection', (socket) => {
    // Subscribe to market rooms (e.g. 'market:BTCUSDT:kline:1m', 'ticker:BTCUSDT', etc.)
    socket.on('subscribe', (room: string) => {
      socket.join(room);
    });

    socket.on('unsubscribe', (room: string) => {
      socket.leave(room);
    });
  });

  // Relay Redis PubSub broadcasts to Socket.io Rooms
  const channelsToSubscribe = ['market:*', 'kline:*', 'ticker:*', 'trades:*', 'orderbook:*'];
  channelsToSubscribe.forEach((pattern) => {
    redisSub.psubscribe(pattern, (err) => {
      if (err) console.error(`Failed to psubscribe ${pattern}:`, err);
      else console.log(`📡 Subscribed to Redis channel pattern: ${pattern}`);
    });
  });

  redisSub.on('pmessage', (_pattern, channel, message) => {
    try {
      const data = JSON.parse(message);
      // Emit to exact channel room
      io.to(channel).emit('update', { channel, data });
    } catch (e) {
      io.to(channel).emit('update', { channel, data: message });
    }
  });

  return io;
}
