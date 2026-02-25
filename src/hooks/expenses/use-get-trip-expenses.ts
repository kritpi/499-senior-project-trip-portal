import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getTripExpenses } from "@/services/api/expenses/get-trip-expenses";
import { expenseKeys } from "@/services/query-keys/expense-keys";

type ExpensesQueryResult = Awaited<ReturnType<typeof getTripExpenses>>

export const useGetTripExpenses = (
    trip_id: number,
    access_token: string,
    options?: Omit<UseQueryOptions<ExpensesQueryResult>, 'queryKey' | 'queryFn'>
) => {
    return useQuery({
        queryKey: expenseKeys.expensesByTrip(trip_id),
        queryFn: () => getTripExpenses(trip_id, access_token)
    })
}