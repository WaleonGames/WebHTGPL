const express = require('express');
const router = express.Router();

// Prosty endpoint do wylogowania użytkownika
router.get('/logout', (req, res) => {
  // Wyczyść dane sesji lub cookie
  // Przekierowanie na stronę główną
  res.redirect('/');
});

module.exports = router;
