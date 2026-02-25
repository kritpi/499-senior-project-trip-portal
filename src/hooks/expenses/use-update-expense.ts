import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateExpense, UpdateExpenseRequest } from "@/services/api/expenses/update-expense";
import { expenseKeys } from "@/services/query-keys/expense-keys";

interface UpdateExpenseVariables {
  trip_id: number;
  body: UpdateExpenseRequest;
  access_token: string;
}

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trip_id, body, access_token }: UpdateExpenseVariables) =>
      updateExpense(trip_id, body, access_token),
    onSuccess: (_, { trip_id }) => {
      queryClient.invalidateQueries({
        queryKey: expenseKeys.expensesByTrip(trip_id),
      });
    },
  });
};
