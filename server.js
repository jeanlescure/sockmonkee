var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('node-uuid');

var port = process.env.PORT || 3000;

app.get('/', function(req, res) {
  res.redirect(301, '/' + uuid.v4());
});

app.get('/:room', function(req, res) {
  console.log('Room requested: ' + req.params.room);
  res.sendfile('index.html');
});

app.use(express.static('public'));

io.on('connection', function(socket) {
  var ROOM_ID = socket.handshake.headers.referer.replace(/^.*?([^\/]*?)\/{0,1}$/g,"$1");

  socket.on('sock.message', function(msg) {
    io.emit('sock.broadcast.' + ROOM_ID + '.' + msg.sender.id, msg);
  });

  socket.on('sock.join.' + ROOM_ID, function(user){
    io.emit('sock.enter.' + ROOM_ID, user);
    console.log('User (' + socket.conn.id + ') connected to room: ' + ROOM_ID);
  });

  socket.on('sock.ack.' + ROOM_ID, function(ack) {
    io.emit('sock.ack.' + ROOM_ID + '.' + ack.to, ack.from);
    console.log('User (' + ack.from.id + ') acknowledged: ' + ack.to);
  });
});

http.listen(port, function() {
  console.log('listening on *:' + port);
});