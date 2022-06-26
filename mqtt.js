const {connect} = require('mqtt')

let client = connect(process.env.STACKHERO_MOSQUITTO_URL_TLS,{
  username: process.env.STACKHERO_MOSQUITTO_USER_LOGIN,
  password: process.env.STACKHERO_MOSQUITTO_USER_PASSWORD
})

module.exports = client