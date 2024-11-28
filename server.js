const express = require('express');
const authRouter = require('./routes/auth');
const indexRouter = require('./routes/dashboard');
const logoutRouter = require('./routes/logout');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Połączenie z MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Połączono z bazą danych MongoDB');
}).catch((error) => {
  console.error('Błąd połączenia z MongoDB:', error);
});

app.use(express.static('public')); // Obsługa plików statycznych

app.set('view engine', 'ejs'); // Ustawienie silnika szablonów na EJS
  
// Routing
app.use('/', authRouter);
app.use('/', indexRouter);
app.use('/', logoutRouter);

const PORT = process.env.PORT || 3000;
  
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
