import AccountProfile from "@/components/forms/AccountProfile"
import { fetchUser } from "@/lib/actions/user.actions"
import {currentUser} from '@clerk/nextjs'
import { redirect } from "next/navigation"
import React from "react"

export default async function Page(){
    const user = await currentUser()
    if(!user) return null

    const userInfo = await fetchUser(user.id)
    if(userInfo?.onboarded) redirect('/')

    const userData = {
        id: user?.id,
        objectId: userInfo?._id,
        username: userInfo? userInfo?.username : user?.username,
        name: userInfo ? userInfo.name : userInfo.firstName || '',
        bio: userInfo ? userInfo?.bio : '',
        image: userInfo ? userInfo?.image : user?.imageUrl
    }

    return(
        <main className="mx-auto flex max-w-3xl flex-col justify-start px-10 py-20">
            <h1 className="head-text">Onboarding</h1>
            <p className="mt-3 text-base-regular text-light-2">
                Complete to profile now to use VOX
            </p>
            <section className="mt-9 bg-dark-2 p-10">
                <AccountProfile 
                user={userData}
                btnTitle='Continue'/>
            </section>
        </main>
    )
}