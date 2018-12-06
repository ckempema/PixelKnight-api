const mongoose = require('mongoose')

const scoreSchema = new mongoose.Schema({
  points: {
    type: Number,
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Score', scoreSchema)
