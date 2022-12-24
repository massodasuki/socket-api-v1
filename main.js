require('dotenv').config();
const app = require('express')()
const http = require('http').createServer(app)
const uuid4 = require('uuid4')
const FormData = require('form-data');
const socketio = require('socket.io')(http)
const axios = require('axios').default;
const Storage = require('node-storage');
const store = new Storage('path/to/file');
var path = require('path');
var errorlog = require(path.join(__dirname, './utils/logger')).errorlog;
var successlog = require(path.join(__dirname, './utils/logger')).successlog;
var telegram = require( path.resolve( __dirname, "./utils/telegram.js" ) );


var isDebug = false;

app.get('/', (req, res) => {
    successlog.info(`Node Server is running. Yay!!`);
    var run = "running";
    telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Node server : ${run}`);
    res.send("Node Server is running. Yay!!")
})


var listOfSocket = [{
    user: 'null',
    socketId: 'null'
}];

socketio.on('connect', socket => {

    socket.on('join', (room) => {
        if (isDebug) { console.log(room); }
        var roomA = '' + room.from + '-' + room.to + '';
        var roomB = '' + room.to + '-' + room.from + '';

        // if (isDebug) { console.log( room.from + ' : ' + socket.id); }
        const index = listOfSocket.findIndex((u) => u.user === room.from)
        // if (isDebug) { console.log(index); }
        if (index == -1) {
            var object = {
                user: room.from,
                socketId: socket.id
            };
            listOfSocket.push(object);
        } else {
            listOfSocket[index] = {
                user: room.from,
                socketId: socket.id
            }
        }
        if (isDebug) { console.log(listOfSocket); }

        // store.put(roomA, 'world');
        var roomName = store.get(roomA) ? store.get(roomA) : store.get(roomB);
        if (roomName) {
            if (isDebug) { console.log("Join Room"); }
            successlog.info(`Join Room: ${room.from}`);
            socket.join(roomName);
        } else {
            if (isDebug) { console.log("Create Room"); }
            successlog.info(`Create Room: ${room.from}`);
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
                method: 'post',
                url: process.env.OPEN_CHAT,
                headers: form.getHeaders(),
                data: form
            })
            .then((resolve) => {
                conversation = resolve.data;
                conversation.room = roomName;
                if (isDebug) { console.log(conversation); }

                // if (isDebug) { if (isDebug) { console.log(roomName);
                // socketio.in(roomName).emit('room', conversation);
                // socketio.to(roomName).emit('room', conversation);
                var socketId = listOfSocket.find(u => u.user === room.from).socketId;
                socketio.to(socketId).emit('room', conversation);
                if (isDebug) { console.log('Load all message for : ', socketId); }
                successlog.info(`Load all message for : ${socketId}`);
            })
            .catch((error) => {
                if (isDebug) { console.log(error); }
                errorlog.error(`Error Message : ${error}`)
                telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error join : ${error}`);
            });


    });

    function postSubmitChat (from, to, msg, media1, media_type, room_name) {
        return new Promise(function(resolve, reject) {

            const form = new FormData();
            
            form.append('from', from);
            form.append('to', to);
            form.append('msg', msg);
            form.append('media1', media1);
            form.append('media_type', media_type);

            axios({
                    method: 'post',
                    url: process.env.SUBMIT_CHAT,
                    headers: form.getHeaders(),
                    data: form
                })
                .then((status) => {
                    // if (isDebug) { console.log(resolve.data) }
                    var conversation = status.data;
                    conversation.room = room_name;
                    if (isDebug) { console.log(conversation); }

                    var toSocketId = listOfSocket.find(u => u.user === to);
                    if (toSocketId) {
                        toSocketId = listOfSocket.find(u => u.user === to).socketId;
                    } else {
                        toSocketId = '';
                    }

                    var fromSocketId = listOfSocket.find(u => u.user === from).socketId;
                    socketio.to(toSocketId).to(fromSocketId).emit('receive_message', conversation);
                    successlog.info(`Send message to : ${fromSocketId} and ${toSocketId}`);
                    return resolve({ ok: 200 });

                })
                .catch((error) => {
                    if (isDebug) { console.log('Send Message', error); }
                    errorlog.error(`Error send_message axios: ${error}`);
                    telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error postSubmitChat : ${error}`);
                    return reject({ok: 500,  msg: error});
              });
                        
        })
    }



    socket.on('send_message', (newMessage) => {
        var roomName = newMessage.room;

        if (isDebug) { console.log(newMessage.media1); }
        if(Array.isArray(newMessage.media1)) {
            var listItem = newMessage.media1;
            for(let i = 0; i < listItem.length; i++){ 
                if (isDebug) { console.log(listItem[i].item, listItem[i].type); }

                if (i != 0) {
                    newMessage.msg = "";
                }
                postSubmitChat (newMessage.from, newMessage.to, newMessage.msg, listItem[i].item, listItem[i].type, roomName)
                    .then((resolve) => {
                        if (isDebug) { console.log(resolve); }
                    })
                    .catch((error) => {
                        if (isDebug) { console.log(error); }
                        errorlog.error(`Error Message : ${error}`)
                        telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error Array.isArray send_message : ${error}`);
                    });
            }

        } else {
            postSubmitChat (newMessage.from, newMessage.to, newMessage.msg, newMessage.media1, newMessage.media_type, roomName)
            .then((resolve) => {
                if (isDebug) { console.log(resolve); }
            })
            .catch((error) => {
                if (isDebug) { console.log(error); }
                errorlog.error(`Error Message : ${error}`);
                telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error send_message : ${error}`);
            });

        }

    });

    socket.on('scroll_max', (room) => {
        var roomName = room.room;

        // if (isDebug) { console.log(socket.id); }

        const form = new FormData();
        form.append('my_id', room.from);
        form.append('to_id', room.to);
        form.append('offset', room.offset);

        axios({
                method: 'post',
                url: process.env.OPEN_CHAT,
                headers: form.getHeaders(),
                data: form
            })
            .then((resolve) => {
                conversation = resolve.data;
                // if (isDebug) { console.log(conversation); }
                conversation.room = roomName;

                // if (isDebug) { console.log(roomName); }
                var socketId = listOfSocket.find(u => u.user === room.from).socketId;
                socketio.to(socketId).emit('room', conversation);
                if (isDebug) { console.log('Scrolling by : ', socketId); }
                successlog.info(`Scrolling by : ${socketId}`);
            })
            .catch((error) => { 
                if (isDebug) { console.log(error); }
                errorlog.error(`Error scroll_max axios : ${error}`);
                telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error scroll_max : ${error}`);
            });
    })


    // Group Chat

    socket.on('join_group', (room) => {
        var roomName = parseInt(room.room);

        socket.join(roomName);
        if (isDebug) { console.log(roomName); }

        const form = new FormData();
        form.append('room', roomName);
        form.append('offset', 0);

        axios({
                method: 'post',
                url: process.env.GROUP_OPEN_CHAT,
                headers: form.getHeaders(),
                data: form
            })
            .then((resolve) => {
                conversation = resolve.data;

                //parse str to int
                var messageList = conversation.data;
                messageList.forEach(strToInt);
                function strToInt(item, index) {
                    messageList[index].type = parseInt(messageList[index].type)
                    messageList[index].broadcast_id = parseInt(messageList[index].broadcast_id)
                    messageList[index].from = parseInt(messageList[index].from)
                    messageList[index].to = parseInt(messageList[index].to)
                    messageList[index].created_at = parseInt(messageList[index].created_at)
                }
                conversation.data = messageList;


                conversation.roomName = roomName;
                conversation.socketId = socket.id;

                if (isDebug) { console.log(conversation); }
                socketio.to(socket.id).emit('group_room', conversation);
            })
            .catch((error) => {
                if (isDebug) { console.log(error); }
                errorlog.error(`Error join_group axios GROUP_OPEN_CHAT : ${error}`);
                telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error join_group : ${error}`);
            });

    });


    function postSubmitGroupChat (from, to, msg, media1, media_type, room_name) {
        return new Promise(function(resolve, reject) {

            const form = new FormData();

            form.append('from', from);
            form.append('to', to);
            form.append('room', room_name);
            form.append('msg', msg);
            form.append('media1', media1);
            form.append('media_type', media_type);

            axios({
                    method: 'post',
                    url: process.env.SUBMIT_GROUP_CHAT,
                    headers: form.getHeaders(),
                    data: form
                })
                .then((resolve) => {
                    if (isDebug) { console.log(resolve.data); }
                    console.log(resolve.data);
                    var conversation = resolve.data;
                    conversation.room = room_name;

                    socketio.in(room_name).emit('receive_group_message', conversation);
                    successlog.info(`Send message to : ${room_name}`);
                })
                .catch((error) => {
                    if (isDebug) { console.log(error); }
                    console.log(error);
                    errorlog.error(`Error send_message_group axios SUBMIT_GROUP_CHAT : ${error}`);
                    telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error postSubmitGroupChat : ${error}`);
                });
                        
        })
    }

    socket.on('send_message_group', (newMessage) => {
        var roomName = parseInt(newMessage.room);


        if (isDebug) { console.log(newMessage.media1); }
        if(Array.isArray(newMessage.media1)) {
            var listItem = newMessage.media1;
            for(let i = 0; i < listItem.length; i++){ 
                if (isDebug) { console.log(listItem[i].item, listItem[i].type); }

                if (i != 0) {
                    newMessage.msg = "";
                }
                postSubmitGroupChat (newMessage.from, newMessage.to, newMessage.msg, listItem[i].item, listItem[i].type, roomName)
                    .then((resolve) => {
                        if (isDebug) { console.log(resolve); }
                    })
                    .catch((error) => {
                        if (isDebug) { console.log(error); }
                        errorlog.error(`Error Message : ${error}`)
                        telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error Array.isArray postSubmitGroupChat loop : ${error}`);
                    });
            }

        } else {
            postSubmitGroupChat (newMessage.from, newMessage.to, newMessage.msg, newMessage.media1, newMessage.media_type, roomName)
            .then((resolve) => {
                if (isDebug) { console.log(resolve); }
            })
            .catch((error) => {
                if (isDebug) { console.log(error); }
                console.log(error);
                errorlog.error(`Error Message : ${error}`)
                telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error send_message_group postSubmitGroupChat : ${error}`);
            });

        }
    });

    socket.on('scroll_max_group', (room) => {
        // if (isDebug) { console.log(room); }
        var roomName = parseInt(room.room);
        var socketId;

        if (room.socket_id && room.socket_id != '') {
            socketId = room.socket_id;
        } else {
            socketId = socket.id;
        }

        socket.join(roomName);

        const form = new FormData();
        form.append('room', roomName);
        form.append('offset', room.offset);

        axios({
                method: 'post',
                url: process.env.GROUP_OPEN_CHAT,
                headers: form.getHeaders(),
                data: form
            })
            .then((resolve) => {
                conversation = resolve.data;

                conversation.roomName = roomName;
                conversation.socketId = socketId;

                //parse str to int
                var messageList = conversation.data;
                messageList.forEach(strToInt);
                function strToInt(item, index) {
                    messageList[index].type = parseInt(messageList[index].type)
                    messageList[index].broadcast_id = parseInt(messageList[index].broadcast_id)
                    messageList[index].from = parseInt(messageList[index].from)
                    messageList[index].to = parseInt(messageList[index].to)
                    messageList[index].created_at = parseInt(messageList[index].created_at)
                }
                conversation.data = messageList;

                if (isDebug) { console.log(conversation); }
                socketio.to(socketId).emit('group_room', conversation);
            })
            .catch((error) => {
                if (isDebug) { console.log(error); }
                errorlog.error(`Error join_group axios GROUP_OPEN_CHAT : ${error}`);
                telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error scroll_max_group : ${error}`);
            });

    })

    socket.on("disconnecting", () => {
        var userId = listOfSocket.find(u => u.socketId === socket.id);

        if (userId) {
            var userId = listOfSocket.find(u => u.socketId === socket.id).user;
            if (isDebug) { console.log('disconnecting ' + userId); }
            successlog.info(`disconnecting: ${userId}`);
        }

    });

    socket.on("disconnect", () => {
        var userId = listOfSocket.find(u => u.socketId === socket.id);

        if (userId) {
            var userId = listOfSocket.find(u => u.socketId === socket.id).user;
            if (isDebug) { console.log('disconnect ' + userId); }
            successlog.info(`disconnect: ${userId}`);
        }
    });

});

const winston = require('winston');
const logger = winston.createLogger({
  exceptionHandlers: [
    new winston.transports.File({ filename: 'log/exceptions.log' })
  ],
  exitOnError: false,
});

process.on('uncaughtException', err => {
    logger.error('There was an uncaught exception: ', err);
    console.error(err && err.stack);
    telegram.sendMessageTL(process.env.TL_TOKEN, process.env.TL_CHAT_ID, `Error uncaughtException : ${err}`);
    console.log('Continue Listening');
    //logger.on('finish', () => process.exit());
    logger.end();
});

http.listen(process.env.PORT)
// http.listen(3000)
