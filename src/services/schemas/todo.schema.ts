import { z } from 'zod';

export const TodoSchema = z.object({
  id: z.number(),
  title: z.string().min(1, 'Title is required'),
  completed: z.boolean(),
  userId: z.number(),
});

export type Todo = z.infer<typeof TodoSchema>;
export const CreateTodoSchema = TodoSchema.omit({ id: true });
export type CreateTodoPayload = z.infer<typeof CreateTodoSchema>;
