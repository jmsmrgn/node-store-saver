const mongoose = require('mongoose')

// import environmental variables from our variables.env file
require('dotenv').config({ path: 'variables.env' })

// connect to our database and handle an bad connections
mongoose.connect(process.env.DATABASE)
mongoose.Promise = global.Promise // tell mongoose to use es6 promises
mongoose.connection.on('error', (err) => {
  console.error(`🙅 🚫 🙅 🚫 🙅 🚫 🙅 🚫 → ${err.message}`)
})

// READY?! Let's go!

// import all of our models
require('./models/Store')

// start our app!
const app = require('./app')
app.set('port', process.env.PORT || 7777)
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → PORT ${server.address().port}`)
})
