const fs = require("fs/promises");
const prisma = require("../models/prisma");
const { upload } = require("../utils/cloudinary-service");
const createError = require("../utils/create-error");
const { STATUS_ACCEPTED } = require("../config/constans");
const { checkPostIdSchema } = require("../validators/post-validator");

const getFriendId = async (tagetUserId) => {
  const relationship = await prisma.friend.findMany({
    where: {
      OR: [{ receiverId: tagetUserId }, { requesterId: tagetUserId }],
      status: STATUS_ACCEPTED,
    },
  });
  const friendIds = relationship.map((el) =>
    el.requesterId === tagetUserId ? el.receiverId : el.requesterId
  );
  return friendIds;
};

exports.createPost = async (req, res, next) => {
  try {
    const { message } = req.body;
    if ((!message || !message.trim()) && !req.file) {
      return next(createError("message of image is required", 400));
    }
    const data = { userId: req.user.id };
    if (req.file) {
      data.image = await upload(req.file.path);
    }
    if (message) {
      data.message = message;
    }

    const post = await prisma.post.create({
      data: data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
      },
    });
    res.status(201).json({ message: "post created !!!", post });
  } catch (err) {
    next(err);
  } finally {
    if (req.file) {
      fs.unlink(req.file.path);
    }
  }
};

exports.getAllPostIncludeFriendPost = async (req, res, next) => {
  try {
    const friendIds = await getFriendId(req.user.id);
    const posts = await prisma.post.findMany({
      where: {
        userId: {
          in: [...friendIds, req.user.id],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
      },
    });
    res.status(200).json({ posts });
  } catch (err) {
    next(err);
  }
};

exports.deletePost =async (req,res,next)=>{
    try {
        const {value ,error} = checkPostIdSchema.validate(req.params)
        if(error){
            return next(error)
        }
        const existPost = await prisma.post.findFirst({
            where :{
                id :value.postId,
                userId : req.user.id
            }
        })
        if(!existPost){
            return next(createError('you cant not delete this post',400))
        }

        await prisma.post.delete({
            where :{
                id : existPost.id
            }
        })
        res.status(200).json({message : 'deleted'})
    } catch (err) {
        next(err)
    }
}