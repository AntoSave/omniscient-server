require('dotenv').config();
const express = require('express')
const wss = require('./modules/websocket-server')
const ws = require('ws');
const path = require('path')
const {parse} = require('url')
const bodyParser = require('body-parser');
const postgres = require('./postgres')
const validationErrorMiddleware = require('./middleware/validation-middleware')
const {verifyToken} = require('./middleware/authentication-middleware')
const cameraRouter = require("./routes/cameras")
const roomRouter = require("./routes/rooms")
const sensorRouter = require("./routes/sensors")
const authRouter = require("./routes/auth")
const statusRouter = require("./routes/status")
const telegrafRouter = require("./routes/telegraf")
const actuatorRouter = require("./routes/actuators")

const PORT = process.env.PORT || 5000

const app = express()

postgres.connect().then(()=>{
  console.log('[DB] Successfully connected to Postgres')
  
  
  app.use(bodyParser.json()) //Da eseguire prima di definire le routes. Entra in funzione solo se Content-Type: application/json
  app.use("/cameras", cameraRouter)
  app.use("/rooms", roomRouter)
  app.use("/sensors", sensorRouter)
  app.use("/actuators", actuatorRouter)
  app.use("/auth", authRouter)
  app.use("/status", statusRouter)
  app.use("/telegraf", telegrafRouter)
  
  app.use(validationErrorMiddleware)
  
  console.log('[EXPRESS] Routes attached')

  const server = app.listen(PORT, () => console.log(`[EXPRESS] Listening on ${ PORT }`))
  
  server.on('upgrade',function upgrade(request, socket, head) {
    const { pathname } = parse(request.url);
    //console.log("sono qui",request,verifyToken(request))
    if (pathname === '/sensor' && verifyToken(request)) { //Abilita il protocollo websocket sulla route /sensor
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    } else {
      //wss.handleUpgrade(request, socket, head, function done(ws) {
        //ws.send({status:"error",message:"User doesn't own sensor!"})
        //console.log(ws)
      //});
      //socket.destroy();
      socket.destroy();
    }
  })
}).catch(err => console.log("[POSTGRES] Error: can't connect to DB!",err))

