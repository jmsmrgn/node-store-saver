const express = require('express')
const router = express.Router()
// const storeController = require('../controllers/storeController')

// router.get('/', storeController.homePage)
router.get('/', (req, res) => {
  res.render('hello')
})

module.exports = router
