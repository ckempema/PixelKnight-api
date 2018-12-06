// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for scores
const Score = require('../models/score')

// we'll use this to intercept any errors that get thrown and send them
// back to the client with the appropriate status code
const handle = require('../../lib/error_handler')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `res.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /scores
router.get('/scores', requireToken, (req, res) => {
  console.log(req)
  Score.find()
    .then(scores => {
      // const newScores = []
      // const scoresbyOwner = scores.filter(score => {
      //   // console.log(score.owner)
      //   // console.log('whoa')
      //   if (score.owner == req.user.id) {
      //     // console.log('you are running the successfull double equals')
      //     // scoresbyOwner.push('you pushed something')
      //     return true
      //   }
      // })
      // console.log(scores)
      // scores.filter(score => req.body.score.owner)
      // requireOwnership(req, scores)
      // `scores` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return scores.map(score => score.toObject())
    })
    // respond with status 200 and JSON of the scores
    .then(scores => res.status(200).json({ scores: scores }))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// SHOW
// GET /scores/5a7db6c74d55bc51bdf39793
router.get('/scores/:id', requireToken, (req, res) => {
  // req.params.id will be set based on the `:id` in the route
  Score.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "score" JSON
    .then(score => res.status(200).json({ score: score.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// CREATE
// POST /scores
router.post('/scores', requireToken, (req, res) => {
  // set owner of new score to be current user
  req.body.score.owner = req.user.id

  Score.create(req.body.score)
    // respond to succesful `create` with status 201 and JSON of new "score"
    .then(score => {
      res.status(201).json({ score: score.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(err => handle(err, res))
})

// UPDATE
// PATCH /scores/5a7db6c74d55bc51bdf39793
router.patch('/scores/:id', requireToken, (req, res) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.score.owner

  Score.findById(req.params.id)
    .then(handle404)
    .then(score => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, score)

      // the client will often send empty strings for parameters that it does
      // not want to update. We delete any key/value pair where the value is
      // an empty string before updating
      Object.keys(req.body.score).forEach(key => {
        if (req.body.score[key] === '') {
          delete req.body.score[key]
        }
      })

      // pass the result of Mongoose's `.update` to the next `.then`
      return score.update(req.body.score)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

// DESTROY
// DELETE /scores/5a7db6c74d55bc51bdf39793
router.delete('/scores/:id', requireToken, (req, res) => {
  Score.findById(req.params.id)
    .then(handle404)
    .then(score => {
      // throw an error if current user doesn't own `score`
      requireOwnership(req, score)
      // delete the score ONLY IF the above didn't throw
      score.remove()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(err => handle(err, res))
})

module.exports = router
