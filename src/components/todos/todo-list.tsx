'use client';

import { useTodos } from '@/hooks/todos/use-todos';

export function TodoList() {
  const { data: todos, isLoading, error } = useTodos();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading todos</div>;

  return (
    <ul className="space-y-2">
      {todos?.map((todo) => (
        <li key={todo.id} className="p-4 border rounded shadow-sm">
          {todo.title}
        </li>
      ))}
    </ul>
  );
}
