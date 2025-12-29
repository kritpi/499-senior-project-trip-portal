import { apiClient } from '@/lib/axios';
import { TodoSchema, type Todo } from '@/services/schemas/todo.schema';

export const getTodos = async (): Promise<Todo[]> => {
  const { data } = await apiClient.get('/todos');
  // In a real app, you might valid against a response wrapper schema if needed
  return TodoSchema.array().parse(data);
};
