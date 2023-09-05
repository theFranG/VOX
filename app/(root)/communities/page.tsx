import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { fetchUser } from "@/lib/actions/user.actions";
import { fetchCommunities } from "@/lib/actions/community.actions";

const Page = ({
     searchParams
     }:{
     searchParams:{[key:string]:string | undefined}}) => {
    return (
     <section>
          <h1 className="head-text mb-10">Communities</h1>
     </section>
    )
  }
  
  export default Page