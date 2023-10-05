const fs = require('fs/promises')
const createError = require("../utils/create-error");
const { upload } =require('../utils/cloudinary-service');
const prisma = require("../models/prisma");
const { checkUserIdSchema } = require('../validators/user-validator');
const { AUTH_USER, UNKNOWN, STATUS_ACCEPTED, FRIEND, REQUESTER, RECEIVER } = require('../config/constans');


const getTagetUserStatusWithAuthUser = async (tagetUserId , authUserId)=> {
if(tagetUserId === authUserId) {
  return AUTH_USER
}
const relationship = await prisma.friend.findFirst({
  where :{
    OR :[
      { requesterId : tagetUserId , receiverId : authUserId},
      { requesterId : authUserId , receiverId : tagetUserId}
    ]
  }
})
if (!relationship){
    return UNKNOWN
}

if (relationship.status === STATUS_ACCEPTED){
  return FRIEND
}

if(relationship.requesterId === authUserId){
  return REQUESTER
}

return RECEIVER
}
const getTargetUserFriend = async (tagetUserId) =>{
  // status accepted and (requester_id = tagetUserId or receiver_id = tagetUserId )
  const relationship = await prisma.friend.findMany({
    where :{
      status : STATUS_ACCEPTED,
      OR :[
        {receiverId : tagetUserId },{requesterId : tagetUserId}
      ]
    }, select :{
      requester : {
        select : {
          id :true,
          firstName : true,
          lastName :true,
          email :true,
          mobile : true,
          profileImage : true,
          coverImage :true
        }
      },
      receiver : {
        select : {
          id :true,
          firstName : true,
          lastName :true,
          email :true,
          mobile : true,
          profileImage : true,
          coverImage :true
        }
      }
    }
  })

  const friends = relationship.map( (el)=> el.requester.id === tagetUserId ? el.receiver : el.requester)
  return friends
}

exports.updateProfile = async (req, res, next) => {
  try {
    // req.file  => .single
    // req.files => .array .fields
    console.log(req.files);
    if (!req.files) {
      return next(createError("profile image or cover image is required"));
    }

    const response = {}

    // ################## ใช้ promise.all ได้ #################
    if (req.files.profileImage) {
      const url = await upload(req.files.profileImage[0].path);
      response.profileImage = url
      await prisma.user.update({
        data : {
            profileImage : url
        }, where :{
            id : req.user.id
        }
      })
    }

    if (req.files.coverImage) {
        const url = await upload(req.files.coverImage[0].path);
        response.coverImage = url
        await prisma.user.update({
            data : {
                coverImage : url
            },where :{
                id : req.user.id
            }
        })
      }

    console.log(response)
    res.status(200).json( response );
  } catch (err) {
    next(err);
  } finally {
    if(req.files.profileImage){
        fs.unlink(req.files.profileImage[0].path)
    }

    if(req.files.coverImage){
        fs.unlink(req.files.coverImage[0].path)
    }
  } 
};

exports.getUserById = async (req,res,next)=>{
  try {
    const { error }=checkUserIdSchema.validate(req.params)
    if(error){
      next(error)
    }
    const userId = +req.params.userId
    const user = await prisma.user.findUnique({
      where : {
        id : userId
      }
    })
    let status = null
    let friends = null
    if(user){
      delete user.password
      status = await getTagetUserStatusWithAuthUser(userId,req.user.id);
      friends = await getTargetUserFriend(userId)
    }

    // if( req.user.id === userId){
    //   status = AUTH_USER
    // } else{
    //   const relationship = await prisma.friend.findFirst({
    //     where :{
    //       OR :[
    //         { requesterId : userId , receiverId : req.user.id},
    //         { requesterId : req.user.id , receiverId : userId}
    //       ]
    //     }
    //   })
    //   if(relationship){
    //     status = UNKNOWN
    //   }else {
    //     if( relationship.status === STATUS_ACCEPTED){
    //       status = FRIEND
    //     } else {
    //       if (relationship.requesterId === userId){
    //         status = REQUESTER
    //       } else {
    //         status = RECEIVER
    //       }
    //     }
    //   }
    // }
    // userId  มาจาก params
    // authId  มาจาก req.user.id

    res.status(200).json({ user ,status , friends })
  } catch (err) {
    next(err)
  }
}
