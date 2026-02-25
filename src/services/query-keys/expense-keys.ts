export const expenseKeys = {
    all: ['expenses'] as const,
    expensesByTrip: (tripId: number) => [...expenseKeys.all, 'trip', tripId] as const
}