const express = require('express')
const router = express.Router()
const postgres = require('../interfaces/postgres')
const influx = require('../interfaces/influx')
const mqttClient = require('../interfaces/mqtt')
const {publish} = require('../modules/pubsub')

router.post("/",(req,res)=>{
  //console.log(req.body)
  if(!req.body.metrics){
    return res.status(200).json("ok")
  }
  //Notifica i client
  req.body.metrics
    //.filter(element => element.name == 'sensor_value')
    .forEach(element => publish(element.tags.sensor_id,{type:element.name,value:element.fields.value||element.fields.connection_status}))
  //Filtra gli eventi che possono innescare l'allarme
  let sensors_to_check = req.body.metrics
    .filter(element => element.name == 'sensor_value' && (element.tags.sensor_type=='MOVEMENT' || (element.tags.sensor_type=='DOOR' && element.fields.value=='OPEN')))
    .map(element => element.tags.sensor_id)
  sensors_to_check.forEach(element => console.log(element));
  if(sensors_to_check.length==0){
    return res.status(200).json("ok")
  }
  //Trova i corrispettivi utenti e i loro buzzer
  const query = 
    `SELECT DISTINCT S.room_user,A.id
      FROM SENSORS S JOIN ACTUATORS A ON S.room_user=A.owner
      WHERE A.type='BUZZER'
      AND S.id = ANY($1)`
  const data = [sensors_to_check]
  postgres.getClient().query(query, data, (error,result) => {
    if(error){
      console.log(error)
      return res.status(200).json("ok")
    }
    var users_buzzers_dict = {}
    result.rows.forEach(element => {
      if(!users_buzzers_dict[element.room_user]){
        users_buzzers_dict[element.room_user]=[]
      }
      users_buzzers_dict[element.room_user].push(element.id)
    })
    console.log(users_buzzers_dict)
    //Per ogni utente controlla se l'allarme è attivo, se lo è attiva tutti i buzzer dell'utente
    Object.entries(users_buzzers_dict).forEach(element =>{
      let user=element[0]
      let buzzers=element[1]
      const fluxQuery =
        `from(bucket:"admin")
          |> range(start: -1y)
          |> filter(fn: (r) => r["_measurement"] == "system_status" and r["username"] == "${user}" and r["_field"] == "alarmed")
          |> last()`
      var alarmed = false
      influx.queryApi.queryRows(fluxQuery,{
        next: (row,tableMeta) => {
          const o = tableMeta.toObject(row)
          alarmed=o._value
        },
        error: error => res.status(200).json("ok"),
        complete: () => {
          console.log(user,alarmed,buzzers)
          if(alarmed){
            buzzers.forEach(element => mqttClient.publish(`OMNISCIENT/BUZZER/${element}/STATE`,'ON'))
          }
          res.status(200).json("ok")
        }
      })
    })
  })
})

module.exports = router