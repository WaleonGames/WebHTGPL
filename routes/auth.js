const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const router = express.Router();

// URL Discord do autoryzacji OAuth2
const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';

// Scopes wymagane do uzyskania danych użytkownika
const SCOPES = ['identify', 'email', 'guilds'];

// Generowanie URL do autoryzacji przez Discord
router.get('/discord', (req, res) => {
  const authURL = `${DISCORD_OAUTH_URL}?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI)}&response_type=code&scope=${SCOPES.join('%20')}`;
  res.redirect(authURL);
});

// Callback po zalogowaniu przez Discord
router.get('/discord/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // Wysyłamy żądanie, aby uzyskać token OAuth2
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

    // Używamy tokenu, aby pobrać dane użytkownika z Discord API
    const userResponse = await axios.get(`${process.env.DISCORD_API_BASE_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user = userResponse.data;

    // Możemy przekierować użytkownika do strony głównej z jego danymi
    res.send(`<h1>Witaj, ${user.username}#${user.discriminator}!</h1><p>E-mail: ${user.email}</p><img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png" alt="Avatar">`);

  } catch (error) {
    console.error('Błąd autoryzacji Discord:', error.response ? error.response.data : error.message);
    res.status(500).send('Wystąpił błąd podczas autoryzacji.');
  }
});

module.exports = router;
