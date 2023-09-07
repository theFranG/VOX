"use server";

import { revalidatePath } from "next/cache";

import { connectToDB } from "../mongoose";

import User from "../models/user.model";
import Post from "../models/post.model";
import Community from "../models/community.model";

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  connectToDB();

  const skipAmount = (pageNumber - 1) * pageSize;

  const postsQuery = Post.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: User,
    })
    .populate({
      path: "community",
      model: Community,
    })
    .populate({
      path: "children",
      populate: {
        path: "author", 
        model: User,
        select: "_id name parentId image", 
      },
    });

  const totalPostsCount = await Post.countDocuments({
    parentId: { $in: [null, undefined] },
  }); 

  const posts = await postsQuery.exec();

  const isNext = totalPostsCount > skipAmount + posts.length;

  return { posts, isNext };
}

interface Params {
  text: string,
  author: string,
  communityId: string | null,
  path: string,
}

export async function createPost({ text, author, communityId, path }: Params
) {
  try {
    connectToDB();

    const communityIdObject = await Community.findOne(
      { id: communityId },
      { _id: 1 }
    );

    const createdPost = await Post.create({
      text,
      author,
      community: communityIdObject
    });

    await User.findByIdAndUpdate(author, {
      $push: { posts: createdPost._id },
    });

    if (communityIdObject) {
      await Community.findByIdAndUpdate(communityIdObject, {
        $push: { posts: createdPost._id },
      });
    }

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create post: ${error.message}`);
  }
}

async function fetchAllChildPosts(postId: string): Promise<any[]> {
  const childPosts = await Post.find({ parentId: postId });

  const descendantPosts = [];
  for (const childPost of childPosts) {
    const descendants = await fetchAllChildPosts(childPost._id);
    descendantPosts.push(childPost, ...descendants);
  }

  return descendantPosts;
}

export async function deletePost(id: string, path: string): Promise<void> {
  try {
    connectToDB();

    const mainPost = await Post.findById(id).populate("author community");

    if (!mainPost) {
      throw new Error("Post not found");
    }

    const descendantPosts = await fetchAllChildPosts(id);

    const descendantPostIds = [
      id,
      ...descendantPosts.map((post) => post._id),
    ];

    const uniqueAuthorIds = new Set(
      [
        ...descendantPosts.map((post) => post.author?._id?.toString()), 
        mainPost.author?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    const uniqueCommunityIds = new Set(
      [
        ...descendantPosts.map((post) => post.community?._id?.toString()), 
        mainPost.community?._id?.toString(),
      ].filter((id) => id !== undefined)
    );

    await Post.deleteMany({ _id: { $in: descendantPostIds } });

    await User.updateMany(
      { _id: { $in: Array.from(uniqueAuthorIds) } },
      { $pull: { posts: { $in: descendantPostIds } } }
    );

    await Community.updateMany(
      { _id: { $in: Array.from(uniqueCommunityIds) } },
      { $pull: { posts: { $in: descendantPostIds } } }
    );

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to delete post: ${error.message}`);
  }
}

export async function fetchPostById(postId: string) {
  connectToDB();

  try {
    const post = await Post.findById(postId)
      .populate({
        path: "author",
        model: User,
        select: "_id id name image",
      }) 
      .populate({
        path: "community",
        model: Community,
        select: "_id id name image",
      }) 
      .populate({
        path: "children", 
        populate: [
          {
            path: "author", 
            model: User,
            select: "_id id name parentId image",
          },
          {
            path: "children", 
            model: Post, 
            populate: {
              path: "author", 
              model: User,
              select: "_id id name parentId image", 
            },
          },
        ],
      })
      .exec();

    return post;
  } catch (err) {
    console.error("Error while fetching post:", err);
    throw new Error("Unable to fetch post");
  }
}

export async function addCommentToThread(
  postId: string,
  commentText: string,
  userId: string,
  path: string
) {
  connectToDB();

  try {
    const originalPost = await Post.findById(postId);

    if (!originalPost) {
      throw new Error("Post not found");
    }

    const commentPost = new Post({
      text: commentText,
      author: userId,
      parentId: postId, 
    });
 
    const savedCommentPost = await commentPost.save();
    
    originalPost.children.push(savedCommentPost._id);

    await originalPost.save();

    revalidatePath(path);
  } catch (err) {
    console.error("Error while adding comment:", err);
    throw new Error("Unable to add comment");
  }
}