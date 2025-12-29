import z from "zod";

export const GoogleAuthReq = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string()
});

export const GoogleAuthResp = z.object({
    access_token: z.string()
})

export type GoogleAuthRequest = z.infer<typeof GoogleAuthReq>;
export type GoogleAuthResp = z.infer<typeof GoogleAuthResp>;