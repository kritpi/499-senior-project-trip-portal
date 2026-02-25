import { apiClient } from "@/lib/axios";
import {GetTripExpenseRequest, GetTripExpenseResponse, GetTripExpensesResSchema} from "@/services/schemas/expense"

export const getTripExpenses = async (trip_id: number, access_token: string): Promise<GetTripExpenseResponse> => {
    try {
        const { data } = await apiClient.get<GetTripExpenseResponse>(`/api/v1/trip/${trip_id}/expense`, {
            headers: {
                "Authorization": `Bearer ${access_token}`
            }
        });
        console.log(data)
        return GetTripExpensesResSchema.parse(data)
    } catch (error) {
        throw error;
    }
}