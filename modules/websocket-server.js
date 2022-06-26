const ws = require('ws');
const uuid = require('uuid');
const {publish, subscribe, unsubscribe} = require('./pubsub');
const wss = new ws.Server({ noServer: true });

wss.on('connection', (socket,request,client) => {
  socket.id=uuid.v4()
  console.log(socket)
  socket.on('message', message => {
    console.log('received: %s', message)
    
  });
  socket.on('close',()=>{console.log('aaaaa')})
});

wss.on('close', () => {
  console.log('wewe')
})

module.exports = wss