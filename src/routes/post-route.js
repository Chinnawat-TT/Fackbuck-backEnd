const express = require('express')

const authenticateMiddleware = require('../middleware/authenticate')
const uploadMiddleware = require('../middleware/upload')
const postController = require('../controllers/post-controller')

const router = express.Router()

router.post('/',authenticateMiddleware ,uploadMiddleware.single('image'),postController.createPost)

module.exports = router