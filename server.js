const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  socket.on('joinGame', ({ name, roomId }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }

    const room = rooms[roomId];
    const numPlayers = Object.keys(room.players).length;

    if (numPlayers >= 2) {
      socket.emit('roomFull');
      return;
    }

    room.players[socket.id] = { name, y: 200, score: 0 };
    socket.join(roomId);
    socket.emit('joined', { id: socket.id, players: room.players });

    io.to(roomId).emit('updatePlayers', room.players);

    if (Object.keys(room.players).length === 2) {
      io.to(roomId).emit('startGame');
    }
  });

  socket.on('move', ({ roomId, y }) => {
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      rooms[roomId].players[socket.id].y = y;
      io.to(roomId).emit('updatePlayers', rooms[roomId].players);
    }
  });

  socket.on('ballUpdate', (ball) => {
    for (let roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        socket.to(roomId).emit('ballUpdate', ball);
      }
    }
  });

  socket.on('scoreUpdate', (scores) => {
    socket.broadcast.emit('scoreUpdate', scores);
  });

  socket.on('gameOver', (winnerName) => {
    socket.broadcast.emit('gameOver', winnerName);
  });

  socket.on('disconnect', () => {
    for (let roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('updatePlayers', rooms[roomId].players);
      }
    }
  });
});

http.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
