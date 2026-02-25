import { apiClient } from "@/lib/axios";
import { UpsertExpenseFormValues } from "@/services/schemas/expense";

export interface UpdateExpenseRequest extends UpsertExpenseFormValues {
  expense_id: string;
}

export const updateExpense = async (
  trip_id: number,
  body: UpdateExpenseRequest,
  access_token: string
): Promise<void> => {
  try {
    await apiClient.put(`/api/v1/trip/${trip_id}/expense`, body, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
  } catch (error) {
    throw error;
  }
};
