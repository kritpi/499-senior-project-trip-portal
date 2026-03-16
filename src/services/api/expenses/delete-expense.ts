import { apiClient } from "@/lib/axios";

export interface DeleteExpenseRequest {
  expense_id: string;
}

export const deleteExpense = async (
  trip_id: number,
  body: DeleteExpenseRequest,
  access_token: string
): Promise<void> => {
  try {
    await apiClient.delete(`/api/v1/trip/${trip_id}/expense`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
      data: body,
    });
  } catch (error) {
    throw error;
  }
};
