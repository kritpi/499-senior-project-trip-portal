import { useQuery } from '@tanstack/react-query';
import { getTodos } from '@/services/api/todos/get-todos';
import { todoKeys } from '@/services/query-keys/todo-keys';

export const useTodos = () => {
  return useQuery({
    queryKey: todoKeys.lists(),
    queryFn: getTodos,
  });
};
