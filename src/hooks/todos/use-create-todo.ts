import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo } from '@/services/api/todos/create-todo';
import { todoKeys } from '@/services/query-keys/todo-keys';

export const useCreateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
};
