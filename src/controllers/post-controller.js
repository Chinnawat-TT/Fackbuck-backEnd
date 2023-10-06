const fs = require('fs/promises')
const prisma = require("../models/prisma")
const { upload } = require("../utils/cloudinary-service")
const createError = require("../utils/create-error")

exports.createPost = async (req , res ,next)=>{
try {
    const { message }=req.body
    if((!message || !message.trim()) && !req.file){
        return next(createError('message of image is required',400))
    }
    const data = { userId : req.user.id, }
    if(req.file){
        data.image = await upload(req.file.path)
    }
    if(message) {
        data.message = message
    }

    await prisma.post.create({
        data: data
    })
    res.status(201).json({message:"post created !!!"})
} catch (err) {
    next(err)
} finally {
    if(req.file){
        fs.unlink(req.file.path)
    }
}
}