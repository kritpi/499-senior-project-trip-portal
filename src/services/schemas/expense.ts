import z from "zod";

export const GetTripExpensesReqSchema = z.object({
    trip_id: z.number(),
})

export const ParticipantSchema = z.object({
    member_id: z.string(),
    name: z.string(),
    image_url: z.string(),
    amount: z.float64()
})

export const ExpenseSchema = z.object({
    expense_id: z.string(),
    title: z.string(),
    amount: z.float64(),
    my_shared: z.float64(),
    created_by: z.string(),
    owner_image: z.string(),
    image_url: z.string(),
    split_type: z.enum(["CUSTOM", "ALL_EQUAL", "SELECTED_EQUAL"]),
    participant: z.array(ParticipantSchema)
})

export const GetTripExpensesResSchema = z.object({
    trip_id: z.number(),
    total_amount: z.float64(),
    my_total_amount: z.float64(),
    avg_per_day: z.float64().optional(),
    my_avg_per_day: z.float64().optional(),
    expenses: z.array(ExpenseSchema)
})

export const UpsertExpenseParticipantSchema = z.object({
    member_id: z.string(),
    name: z.string(),
    image_url: z.string(),
    amount: z.number().min(0),
})

export const UpsertExpenseSchema = z.object({
    title: z.string().min(1, "Title is required"),
    amount: z.number().positive("Amount must be greater than 0"),
    image_url: z.string().optional(),
    split_type: z.enum(["CUSTOM", "ALL_EQUAL", "SELECTED_EQUAL"]),
    participant: z.array(UpsertExpenseParticipantSchema),
}).superRefine((data, ctx) => {
    if (data.split_type === "SELECTED_EQUAL" && data.participant.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["participant"],
            message: "Please select at least one member.",
        });
    }
});

export type GetTripExpenseRequest = z.infer<typeof GetTripExpensesReqSchema>;
export type GetTripExpenseResponse = z.infer<typeof GetTripExpensesResSchema>;
export type UpsertExpenseFormValues = z.infer<typeof UpsertExpenseSchema>;
