const express = require('express');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Używanie routingu dla autoryzacji
app.use('/auth', authRoutes);

// Strona główna
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
