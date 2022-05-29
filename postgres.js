const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://jzfcodmvddjeex:62e3a53e22b8990bc62cb88eca4cb6e46a8d81196dc3a288d2d83d43e53d5ab1@ec2-34-242-84-130.eu-west-1.compute.amazonaws.com:5432/dd15j9gkp4iggq',
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports.connect = async () => {
  client.connect()
}

module.exports.getClient = () => {
  return client
}