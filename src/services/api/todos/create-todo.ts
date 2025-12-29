import { apiClient } from '@/lib/axios';
import { CreateTodoSchema, type CreateTodoPayload, type Todo } from '@/services/schemas/todo.schema';

export const createTodo = async (payload: CreateTodoPayload): Promise<Todo> => {
  const { data } = await apiClient.post('/todos', payload);
  return data;
};
