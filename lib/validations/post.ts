import * as z from 'zod'

export const PostValidation = z.object({
    post: z.string().nonempty()
    .min(3, {message:'Minimum 3 characters'})
    .max(1000, {message:'Maximun 1000 characters'}),

})

export const CommentValidation = z.object({
    thread: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
})
