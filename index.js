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


socketio.on('connect', socket => {
    var roomName, people;
    socket.on('join', (room) => {
    console.log(room);
    var roomA = ''+room.from +'-'+ room.to+'';
    var roomB = ''+room.to +'-'+ room.from+'';

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
      socketio.to(roomName).emit('room', conversation);      
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
      form.append('media1',"");
      form.append('media_type',"");

      axios({
        method  : 'post',
        url     : process.env.SUBMIT_CHAT,
        headers : form.getHeaders(),
        data    : form
      })
      .then((resolve) => {
        console.log(resolve.data);

        const form = new FormData();
        form.append('my_id', newMessage.from);
        form.append('to_id', newMessage.to);
        form.append('offset', 0);

        axios({
          method  : 'post',
          url     : 'https://hafiz.work/api/mobile/open-chat',
          headers : form.getHeaders(),
          data    : form
        })
        .then((resolve) => {
          conversation = resolve.data;
          // console.log(conversation);
          conversation.room = roomName;
          conversation.people = people;

          // console.log(roomName);
          socketio.to(roomName).emit('room', conversation);      
        })
        .catch((error) => console.log(error));
      })
      .catch((error) => console.log(error));
            
    });

    socket.on('scroll_max', (room, callback) => {
          // var roomA = ''+room.from +'-'+ room.to+'';
          // var roomB = ''+room.to +'-'+ room.from+'';

          // store.put(roomA, 'world');
          // var roomName = store.get(roomA) ? store.get(roomA) : store.get(roomB);

          // var people = store.get(roomName);
          // var roomName = room.roomName;

          // if (!room.from) {
          //   var people = store.get(roomName);
          //     room.from
          // }

          // if (!room.to) {
          //     room.to
          // }
          // console.log(room);

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
            socketio.to(roomName).emit('room', conversation);      
          })
          .catch((error) => console.log(error));

    
});


http.listen(process.env.PORT)
// http.listen(3000)


