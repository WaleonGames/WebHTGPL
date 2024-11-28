const mongoose = require('mongoose');
const { Schema } = mongoose;

const cookieSchema = new Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
  },
  access_token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400,  // Czas życia ciasteczka (1 dzień)
  },
});

module.exports = mongoose.model('Cookie', cookieSchema);
