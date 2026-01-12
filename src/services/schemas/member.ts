import z, { email } from "zod";

export const MemberSchema = z.object({
    member_id: z.string(),
    name: z.string(),
    image_url: z.string(),
    role: z.string()
})

export type MemberSchema = z.infer<typeof MemberSchema>;


export const CreateMemberInvitation = z.object({
    email: z.string(),
    role: z.string()
})
export type CreateMemberInvitation = z.infer<typeof CreateMemberInvitation>;