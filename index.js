const express = require('express')
const path = require('path')
const bodyParser = require('body-parser');
const postgres = require('./postgres')
const {	ValidationError } = require("express-json-validator-middleware");
const cameraRouter = require("./routes/cameras")
const roomRouter = require("./routes/rooms")
const sensorRouter = require("./routes/sensors")
const PORT = process.env.PORT || 5000

function validationErrorMiddleware(error, request, response, next) {
	if (response.headersSent) {
		return next(error); //non è un errore di valudazione
	}

	const isValidationError = error instanceof ValidationError;
	if (!isValidationError) {
		return next(error); //non è un errore di valudazione
	}

	response.status(400).json({
		errors: error.validationErrors, //riporta gli errori di validazione
	});

	next();
}

postgres.connect().then(()=>{
  console.log('[DB] Successfully connected to Postgres')
  app = express()
  
  app.use(bodyParser.json()) //Da eseguire prima di definire le routes. Entra in funzione solo se Content-Type: application/json
  app.use("/cameras", cameraRouter)
  app.use("/rooms", roomRouter)
  app.use("/sensors", sensorRouter)
  app.use(validationErrorMiddleware)
    //.use(express.static(path.join(__dirname, 'public')))
    //.set('views', path.join(__dirname, 'views'))
    //.set('view engine', 'ejs')
    //.get('/', (req, res) => res.render('pages/index'))
  
  console.log('[EXPRESS] Routes attached')
  app.listen(PORT, () => console.log(`[EXPRESS] Listening on ${ PORT }`))
}).catch(err => console.log("[POSTGRES] Error: can't connect to DB!"))

