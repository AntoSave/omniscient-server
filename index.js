require('dotenv').config();
const express = require('express')
const wss = require('./modules/websocket-server')
const ws = require('ws');
const path = require('path')
const {parse} = require('url')
const bodyParser = require('body-parser');
const postgres = require('./postgres')
const validationErrorMiddleware = require('./middleware/validation-middleware')
const cameraRouter = require("./routes/cameras")
const roomRouter = require("./routes/rooms")
const sensorRouter = require("./routes/sensors")
const authRouter = require("./routes/auth")
const PORT = process.env.PORT || 5000

const app = express()


postgres.connect().then(()=>{
  console.log('[DB] Successfully connected to Postgres')
  
  
  app.use(bodyParser.json()) //Da eseguire prima di definire le routes. Entra in funzione solo se Content-Type: application/json
  app.use("/cameras", cameraRouter)
  app.use("/rooms", roomRouter)
  app.use("/sensors", sensorRouter)
  app.use("/auth", authRouter)
  app.post("/",(req,res,next)=>{
    console.log(req.body)
    res.status(200).json("wewe")
    next()
  })
  app.use(validationErrorMiddleware)
    //.use(express.static(path.join(__dirname, 'public')))
    //.set('views', path.join(__dirname, 'views'))
    //.set('view engine', 'ejs')
    //.get('/', (req, res) => res.render('pages/index'))
  
  console.log('[EXPRESS] Routes attached')

  const server = app.listen(PORT, () => console.log(`[EXPRESS] Listening on ${ PORT }`))
  
  server.on('upgrade',function upgrade(request, socket, head) {
    const { pathname } = parse(request.url);
    if (pathname === '/sensor') { //Abilita il protocollo websocket sulla route /sensor
      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  })
}).catch(err => console.log("[POSTGRES] Error: can't connect to DB!",err))

