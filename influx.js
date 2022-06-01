const { InfluxDB, Point } = require('@influxdata/influxdb-client')
const url = 'https://'+process.env.STACKHERO_INFLUXDB_HOST
const organization = process.env.STACKHERO_INFLUXDB_ADMIN_ORGANIZATION
const token = process.env.INFLUX_API_TOKEN

const queryApi = new InfluxDB({url,token}).getQueryApi(organization)

module.exports.queryApi = queryApi
