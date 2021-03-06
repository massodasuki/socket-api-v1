require('dotenv').config();
const app = require('express')()
const http = require('http').createServer(app)
const uuid4 = require('uuid4')
const FormData = require('form-data');
const socketio = require('socket.io')(http)
const axios = require('axios').default;
var Storage = require('node-storage');
var store = new Storage('path/to/file');

app.get('/', (req, res) => {
    res.send("Node Server is running. Yay!!")
})

var listOfSocket = [{user:'null', socketId:'null' }];
socketio.on('connect', socket => {
    var roomName, people;
    
    socket.on('join', (room) => {
    // console.log(room);
    var roomA = ''+room.from +'-'+ room.to+'';
    var roomB = ''+room.to +'-'+ room.from+'';
    
    // console.log( room.from + ' : ' + socket.id);
    const index = listOfSocket.findIndex((u) => u.user === room.from)
    // console.log(index);
    if (index == -1) {
      var object = { user : room.from, socketId : socket.id };
      listOfSocket.push(object);
    } else {
      listOfSocket[index] = { user: room.from, socketId: socket.id}
    }
    console.log(listOfSocket);

    // store.put(roomA, 'world');
    var roomName = store.get(roomA) ? store.get(roomA) : store.get(roomB);
    if (roomName) {
      console.log("Join Room");
      socket.join(roomName);
    }
    else {
      console.log("Create Room");
      var roomUuid = uuid4();
      store.put(roomA, roomUuid);
      store.put(roomB, roomUuid);
      store.put(roomUuid, roomA);
      store.put(roomUuid, roomB);
      roomName = roomUuid;
      socket.join(roomName);
    }

    const form = new FormData();
    form.append('my_id', room.from);
    form.append('to_id', room.to);
    form.append('offset', 0);

    axios({
      method  : 'post',
      url     :  process.env.OPEN_CHAT,
      headers : form.getHeaders(),
      data    : form
    })
    .then((resolve) => {
      conversation = resolve.data;
      // console.log(conversation);
      conversation.room = roomName;
      conversation.people = people;

      // console.log(roomName);
      // socketio.in(roomName).emit('room', conversation);
      // socketio.to(roomName).emit('room', conversation);
      var socketId = listOfSocket.find(u => u.user === room.from).socketId;
      socketio.to(socketId).emit('room', conversation);
       console.log('Load all message for : ', socketId);
    })
    .catch((error) => console.log(error));


  });

  socket.on('send_message', (newMessage, callback) => {
      var roomName = newMessage.room;

      const form = new FormData();
      // console.log(newMessage);
      form.append('from', newMessage.from);
      form.append('to', newMessage.to);
      form.append('msg', newMessage.msg);
      form.append('media1',newMessage.media1);
      form.append('media_type',newMessage.media_type);

      axios({
        method  : 'post',
        url     : process.env.SUBMIT_CHAT,
        headers : form.getHeaders(),
        data    : form
      })
      .then((resolve) => {
        // console.log(resolve.data);

        const form = new FormData();
        form.append('my_id', newMessage.from);
        form.append('to_id', newMessage.to);
        form.append('offset', 0);

        axios({
          method  : 'post',
          url     : process.env.OPEN_CHAT,
          headers : form.getHeaders(),
          data    : form
        })
        .then((resolve) => {
          conversation = resolve.data;
          // console.log(conversation);
          conversation.room = roomName;
          conversation.people = people;

          var socketId = listOfSocket.find(u => u.user === newMessage.to).socketId;
          // console.log(socketId);

          // console.log(roomName);
          // socketio.to(socketId).emit('room', conversation);
          // socketio.in(roomName).emit('room', conversation);

          var toSocketId = listOfSocket.find(u => u.user === newMessage.to).socketId;
          var fromSocketId = listOfSocket.find(u => u.user === newMessage.from).socketId;
          socketio.to(toSocketId).to(fromSocketId).emit('room', conversation);
          console.log('Message send to : ', toSocketId, ' and ', fromSocketId);
        })
        .catch((error) => console.log('List all', error));
      })
      .catch((error) => console.log('Send Message', error));
    });

    socket.on('scroll_max', (room, callback) => {
          var roomName = room.room;
          
          // console.log(socket.id);

          const form = new FormData();
          form.append('my_id', room.from);
          form.append('to_id', room.to);
          form.append('offset', room.offset);

          axios({
            method  : 'post',
            url     :  process.env.OPEN_CHAT,
            headers : form.getHeaders(),
            data    : form
          })
          .then((resolve) => {
            conversation = resolve.data;
            // console.log(conversation);
            conversation.room = roomName;
            conversation.people = people;

          // console.log(roomName);
          var socketId = listOfSocket.find(u => u.user === room.from).socketId;
          socketio.to(socketId).emit('room', conversation);
          console.log('Scrolling by : ', socketId);    
        })
        .catch((error) => console.log(error));

      })


    // Group Chat

    socket.on('join_broadcast', (room) => {
    // console.log(room);
    var broadcastId = room.broadcast_id;

    socket.join(broadcastId);
    
    const form = new FormData();
    form.append('broadcast_id', room.broadcast_id);
    form.append('my_id', room.from);
    form.append('offset', 0);

    axios({
      method  : 'post',
      url     :  process.env.BROADCAST_OPEN_CHAT,
      headers : form.getHeaders(),
      data    : form
    })
    .then((resolve) => {
      conversation = resolve.data;
      // console.log(conversation);
      // console.log(roomName);
      conversation.broadcastId = broadcastId;
      // socketio.to(broadcastId).emit('broadcast', conversation);
      var socketId = listOfSocket.find(u => u.user === room.from).socketId;
      socketio.to(socketId).emit('broadcast', conversation);      
    })
    .catch((error) => console.log(error));


  });

  socket.on('send_message_broadcast', (newMessage, callback) => {
      var broadcastId = newMessage.broadcastId;

      const form = new FormData();
      // console.log(newMessage);
      form.append('broadcast_id', newMessage.broadcast_id);
      form.append('from', newMessage.from);
      form.append('msg', newMessage.msg);
      form.append('media1',newMessage.media1);
      form.append('media_type',newMessage.media_type);

      axios({
        method  : 'post',
        url     : process.env.BROADCAST_SUBMIT_CHAT,
        headers : form.getHeaders(),
        data    : form
      })
      .then((resolve) => {
        console.log(resolve.data);

        const form = new FormData();
        form.append('broadcast_id', newMessage.broadcast_id);
        form.append('my_id', newMessage.from);
        form.append('offset', 0);

        axios({
          method  : 'post',
          url     : process.env.BROADCAST_OPEN_CHAT,
          headers : form.getHeaders(),
          data    : form
        })
        .then((resolve) => {
          conversation = resolve.data;
          // console.log(conversation);
          conversation.broadcastId = broadcastId;

          // console.log(broadcastId);
          // socketio.in(broadcastId).emit('broadcast', conversation);
          var socketId = listOfSocket.find(u => u.user === room.from).socketId;
          socketio.to(socketId).emit('broadcast', conversation);      
        })
        .catch((error) => console.log(error));
      })
      .catch((error) => console.log(error));
            
    });

    socket.on('scroll_max_broadcast', (room, callback) => {
          var broadcastId = room.broadcast_id;
          
          // console.log(room);

          const form = new FormData();
          form.append('broadcast_id', room.broadcast_id);
          form.append('my_id', room.from);
          form.append('offset', room.offset);

          axios({
            method  : 'post',
            url     :  process.env.BROADCAST_OPEN_CHAT,
            headers : form.getHeaders(),
            data    : form
          })
          .then((resolve) => {
            conversation = resolve.data;
            // console.log(conversation);
            conversation.broadcastId = broadcastId;

            //console.log(broadcastId);
          // socketio.to(broadcastId).emit('broadcast', conversation);
          var socketId = listOfSocket.find(u => u.user === room.from).socketId;
          socketio.to(socketId).emit('broadcast', conversation);    
        })
        .catch((error) => console.log(error));

      })
    
});


http.listen(process.env.PORT)
// http.listen(3000)


