const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const User = require('../models/User'); // Model User
const Cookie = require('../models/Cookie'); // Model Cookie
require('dotenv').config();

const router = express.Router();

// URL Discord do autoryzacji OAuth2
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_API_URL = 'https://discord.com/api/v10';

// Scopes wymagane do uzyskania danych użytkownika
const SCOPES = ['identify', 'email', 'guilds'];

// Middleware do obsługi cookies i sesji
router.use(cookieParser());
router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 86400000,  // 1 dzień
  },
}));

// Generowanie URL do autoryzacji przez Discord
router.get('/auth/discord', (req, res) => {
  const authURL = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&scope=identify+email+guilds`;  
  res.redirect(authURL);
});

router.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Uzyskanie tokena OAuth2
    const tokenResponse = await axios.post(DISCORD_TOKEN_URL, querystring.stringify({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token } = tokenResponse.data;

    // Uzyskanie danych użytkownika
    const userResponse = await axios.get(`${DISCORD_API_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    let user = await User.findOne({ discordId: userResponse.data.id });

    if (!user) {
      user = new User({
        discordId: userResponse.data.id,
        username: userResponse.data.username,
        discriminator: userResponse.data.discriminator,
        email: userResponse.data.email,
        avatar: userResponse.data.avatar,
        access_token: access_token,
      });
      await user.save();
    } else {
      user.username = userResponse.data.username;
      user.discriminator = userResponse.data.discriminator;
      user.email = userResponse.data.email;
      user.avatar = userResponse.data.avatar;
      user.access_token = access_token;
      user.discordId = userResponse.data.id;
      await user.save();
    }

    // Zapisz dane użytkownika w sesji
    req.session.user = {
      username: user.username,
      discriminator: user.discriminator,
      discordId: user.discordId,
      avatar: user.avatar,
      email: user.email,
    };

    // Zapisz token w bazie danych w modelu Cookie
    await Cookie.findOneAndUpdate(
      { discordId: user.discordId },
      { access_token: access_token },
      { upsert: true }  // Jeśli nie istnieje, to go utwórz
    );

    // Uzyskanie listy serwerów, do których należy użytkownik
    const guildsResponse = await axios.get(`${DISCORD_API_URL}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Filtrujemy tylko te serwery, na których użytkownik ma uprawnienie ADMINISTRATION
    const adminGuilds = guildsResponse.data.filter(guild => {
      return guild.permissions & (1 << 3); // Sprawdzamy, czy bit odpowiadający ADMINISTRATOR jest ustawiony
    });

    req.session.user.guilds = adminGuilds;

    // Przekierowanie na dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Błąd autoryzacji Discord:', error.response ? error.response.data : error.message);
    res.status(500).send('Wystąpił błąd podczas autoryzacji.');
  }
});

function isAuthenticated(req, res, next) {
  // Sprawdź, czy sesja zawiera użytkownika
  if (req.session && req.session.user && req.session.user.discordId) {
    // Jeśli użytkownik jest zalogowany, przejdź do następnego middleware
    Cookie.findOne({ discordId: req.session.user.discordId })
      .then(cookie => {
        if (cookie) {
          return next(); // Użytkownik jest uwierzytelniony, przejdź do kolejnej funkcji
        }
        res.redirect('/auth/discord');  // Brak tokenu, przekierowanie na stronę logowania
      })
      .catch(() => {
        res.redirect('/auth/discord');  // Błąd w sprawdzaniu tokenu, przekierowanie na logowanie
      });
  } else {
    // Jeśli sesja nie zawiera użytkownika, przekieruj na stronę logowania
    console.log("Brak danych w sesji użytkownika. Przekierowanie na stronę logowania...");
    res.redirect('/auth/discord');
  }
}

router.get('/dashboard', isAuthenticated, (req, res) => {
  const { username, discriminator, avatar, email, guilds, discordId } = req.session.user;
  res.render('dashboard', {
    username,
    discriminator,
    avatar,
    email,
    guilds,
    discordId
  });
});

// Trasa do edytora serwera
router.get('/guild-editor/:guildId', isAuthenticated, async (req, res) => {
  const { discordId, access_token } = req.session.user;  // Pobieramy dane użytkownika z sesji
  const { guildId } = req.params;  // Pobieramy ID serwera z URL

  try {
    // Pobieramy dane serwera Discorda z API
    const guildData = await getGuildData(discordId, access_token, guildId);

    // Renderujemy widok z danymi o serwerze
    res.render('guild-editor', {
      username: req.session.user.username,  // Nazwa użytkownika
      discriminator: req.session.user.discriminator,  // Dyskryminator
      avatar: req.session.user.avatar,  // Avatar użytkownika
      guild: guildData  // Dane serwera
    });
  } catch (error) {
    console.error('Błąd pobierania danych o serwerze:', error);
    res.status(500).send('Wystąpił błąd podczas pobierania danych o serwerze.');
  }
});

async function getGuildData(discordId, accessToken, guildId) {
  try {
    // Wysyłamy zapytanie do API Discorda
    const response = await axios.get(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error('Błąd API Discorda');
    }
  } catch (error) {
    console.error('Błąd w funkcji getGuildData:', error);
    throw error;
  }
}

module.exports = router;
