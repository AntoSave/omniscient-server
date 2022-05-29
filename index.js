const express = require('express')
const path = require('path')
const bodyParser = require('body-parser');
const { Client } = require('pg');

const PORT = process.env.PORT || 5000

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const cameraRouter = require("./routes/cameras")
const roomRouter = require("./routes/cameras")

client.connect()
app = express()
app.use(bodyParser.json())
app.use("/cameras", cameraRouter)
app.use("/rooms", roomRouter)
  //.use(express.static(path.join(__dirname, 'public')))
  //.set('views', path.join(__dirname, 'views'))
  //.set('view engine', 'ejs')
  //.get('/', (req, res) => res.render('pages/index'))




app.listen(PORT, () => console.log(`Listening on ${ PORT }`))
