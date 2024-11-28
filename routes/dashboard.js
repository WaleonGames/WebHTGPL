const express = require('express');
const User = require('../models/User'); // Import modelu User
const router = express.Router();

router.get('/', (req, res) => {
    // Link do index.ejs
    res.render('index');
})

module.exports = router;
