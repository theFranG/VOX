import { fetchUserPosts } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import PostCard from "../cards/PostCard";


interface Props {
  currentUserId: string;
  accountId: string;
  accountType: string;
}

const ThreadsTab = async ({ currentUserId, accountId, accountType }: Props) => {
  let result = await fetchUserPosts(accountId);

  if (!result) redirect("/");

  return (
    <section className="flex flex-col gap-10 mt-9">
      {result.post.map((post:any) => (
        <PostCard
          key={post._id}
          id={post._id}
          currentUserId={currentUserId}
          parentId={post.parentId}
          content={post.text}
          author={
            accountType === 'User' ?
            {name: result.name, image:result.image, id: result.id}
            :{name: post.author.name, image: post.author.image, id: post.author.id }
          }
          community={post.community}
          createdAt={post.createdAt}
          comments={post.children}
        />
      ))}
    </section>
  );
};

export default ThreadsTab;
