'use server'

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";
import Post from "../models/post.model";
import User from "../models/user.model";

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}


export async function createPost({ 
    text, 
    author, 
    communityId, 
    path 
}: Params) {
    try{    
        connectToDB()
        
        const createdPost = await Post.create({
            text,
        author,
        community:null
    })

    await User.findByIdAndUpdate(author,{
        $push:{ post: createdPost._id}
    })

    revalidatePath(path)
}catch (error:any){
    throw new Error (`Error creating a post ${error.message}`)
}

}

export async function fetchPosts(pageNumber = 1, pageSize = 20){
    connectToDB()

    const skipAmount = (pageNumber - 1) * pageSize

    const postQuery = Post.find({
    parentId:{$in:[null, undefined]}})
    .sort({createdAt:'desc'})
    .skip(skipAmount)
    .limit(pageSize)
    .populate({path:'author', model:User})
    .populate({
        path:'children',
        populate:{
            path:'author',
            model: User,
            select:'_id name parentId image'
        }
    })

    const totalPostsCount = await Post.countDocuments({parentId:{$in:[null, undefined]}})

    const posts = await postQuery.exec()

    const isNext = totalPostsCount > skipAmount + posts.length

    return {posts, isNext}
}

export async function fetchThreadById(id:string){
    connectToDB()

    try {
        const thread = await Post.findById(id)
        .populate({
            path:'author',
            model:User,
            select: '_id id name username image'
        })
        .populate({
        path: "children", 
        populate: [
          {
            path: "author",
            model: User,
            select: "_id id name username parentId image", 
          },
          {
            path: "children", 
            model: Post, 
            populate: {
              path: "author",
              model: User,
              select: "_id id name parentId username image",
            },
          },
        ],
      }).exec()
        
        return thread
    } catch (error:any) {
        throw new Error(`Error fetching thread: ${error.message}`)
    }
}

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string
  ) {
    connectToDB();
  
    try {
      const originalThread = await Post.findById(threadId);
  
      if (!originalThread) {
        throw new Error("Thread not found");
      }
  
      const commentThread = new Post({
        text: commentText,
        author: userId,
        parentId: threadId,
      });
  
      const savedCommentThread = await commentThread.save();
  
      originalThread.children.push(savedCommentThread._id);
  
      await originalThread.save();
  
      revalidatePath(path);
    } catch (err) {
      console.error("Error while adding comment:", err);
      throw new Error("Unable to add comment");
    }
  }