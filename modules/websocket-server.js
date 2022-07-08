const ws = require('ws');
const uuid = require('uuid');
const {publish, subscribe, unsubscribe, unsubscribeAll} = require('./pubsub');
const {userOwnsSensor} = require('../middleware/authentication-middleware')
const wss = new ws.Server({ noServer: true });
var {Validator} = require('jsonschema');
const v = new Validator()

var payloadSchema = {
  "type": "object",
  "properties": {
    "action": {"type": "string","pattern": "\^(?:subscribe|unsubscribe)\$"},
    "sensor_id": {"type": "string"}
  },
  "required": ["action","sensor_id"]
};

wss.on('connection',(socket,request,client) => {
  socket.id=uuid.v4()
  //console.log(socket)
  socket.on('message', async message => {
    try{
      payload = JSON.parse(message)
    } catch (ex) {
      console.log("Exception",ex.message)
      return
    }
    console.log('Received: ', payload)
    var isValid = v.validate(payload, payloadSchema).valid
    if(!isValid){
      console.log("Not valid")
      socket.send({status:"error",message:"Invalid message formatting!"})
      return
    }
    console.log("Valid")
    switch(payload.action){
      case 'subscribe':
        let usrOwnsSensor = await userOwnsSensor(request.username,payload.sensor_id)
        if(!usrOwnsSensor){
          console.log("User doesn't own sensor!")
          socket.send({status:"error",message:"User doesn't own sensor!"})
          return
        }
        console.log("Subscribing")
        socket.send({status:"success",message:"Successfully subscribed to " + payload.sensor_id})
        subscribe(socket,payload.sensor_id)
        break
      case 'unsubscribe':
        console.log("Unsubscribing")
        socket.send({status:"success",message:"Successfully unsubscribed to " + payload.sensor_id})
        unsubscribe(socket,payload.sensor_id)
        break
    }
  });
  socket.on('close',()=>{
    console.log("Connection closed")
    unsubscribeAll(socket)
  })
});

wss.on('close', () => {

})

module.exports = wss