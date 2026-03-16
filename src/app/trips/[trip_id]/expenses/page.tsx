"use client";

import ErrorCard from "@/components/common/ErrorCard";
import ProgressLoading from "@/components/ui/loading-animation";
import { useGetTripExpenses } from "@/hooks/expenses/use-get-trip-expenses";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { expenseKeys } from "@/services/query-keys/expense-keys";
import { Button } from "@/components/ui/button";
import TotalExpenseAmount from "@/components/expense/total-amount-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseList from "@/components/expense/expense-list";
import UpsertExpenseDialog from "@/components/expense/upsert-expense-dialog";
import { ExpenseSchema } from "@/services/schemas/expense";
import { getTripById } from "@/services/api/trip/get-trip-by-id";
import { useQuery } from "@tanstack/react-query";
import { tripKeys } from "@/services/query-keys/trip-keys";
import z from "zod";
import { deleteExpense } from "@/services/api/expenses/delete-expense";

export default function Expenses() {
  const router = useRouter();
  const params = useParams();
  const tripId = parseInt(params.trip_id as string);
  const queryClient = useQueryClient();

  const [accessToken, setAccessToken] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("allExpenses");
  const [selectedExpense, setSelectedExpense] =
    useState<z.infer<typeof ExpenseSchema>>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Fetch trip details to get user role
  const { data: tripData } = useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => getTripById(tripId, accessToken),
    enabled: !!accessToken && !!tripId,
  });

  const isViewer = tripData?.role === "VIEWER";

  // Handle clicking on expense card
  function handleExpenseListCardClick(
    expense: z.infer<typeof ExpenseSchema>,
  ): void {
    setSelectedExpense(expense);
    setIsDialogOpen(true);
  }

  // Fetch trip's expenses
  const {
    data: tripExpenses,
    isLoading,
    error,
  } = useGetTripExpenses(tripId, accessToken);
  if (isLoading) {
    return <ProgressLoading />;
  }

  if (error) {
    return (
      <ErrorCard
        error={error}
        title="Failed to get trip's expense"
        onAction={() => router.push(`/trips/${tripId}/activities`)}
        actionLabel="Back to trip's activities"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Expense detail dialog */}
      <UpsertExpenseDialog
        expense={selectedExpense}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        tripId={tripId}
        accessToken={accessToken}
        isViewer={isViewer}
      />

      {/* Main */}
      <main className="flex-1 pt-10 pb-12 max-w-full">
        <div className="ml-12 mr-17">
          {/* heading */}
          <div className="grid grid-cols-2 mb-2">
            <div className="ml-2">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Expenses Management
              </h1>
              <p className="text-muted-foreground">
                Track your spending across your trip
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {!isViewer && (
                <Button
                  variant="default"
                  size="lg"
                  className="justify-self-end place-self-end"
                  onClick={() => {
                    setSelectedExpense(undefined);
                    setIsDialogOpen(true);
                  }}
                >
                  Add New Expense
                </Button>
              )}
            </div>
          </div>

          {/* trip total amount, my total amount */}
          <div className="grid grid-cols-2 gap-5">
            {/* budget card */}
            <TotalExpenseAmount
              type="Trip Total Expense"
              amount={tripExpenses?.total_amount ?? 0}
              variant="primary"
              avgPerDay={tripExpenses?.avg_per_day}
            />
            <TotalExpenseAmount
              type="My Total Expense"
              amount={tripExpenses?.my_total_amount ?? 0}
              variant="destructive"
              avgPerDay={tripExpenses?.my_avg_per_day}
            />
          </div>
          <div className="my-5">
            <Tabs
              defaultValue="allExpenses"
              onValueChange={(value) => setSelectedTab(value)}
            >
              <TabsList variant="line" className="mb-2">
                <TabsTrigger
                  className="font-semibold text-md text-muted-foreground"
                  value="allExpenses"
                >
                  All Expenses
                </TabsTrigger>
                <TabsTrigger
                  className="font-semibold text-md text-muted-foreground"
                  value="myExpenses"
                >
                  My Expenses
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* expenses lists */}
            <div className="my-2">
              <div className="grid grid-cols-11 w-full mb-2 px-5">
                <div className="col-span-3 text-muted-foreground font-semibold">
                  Title
                </div>
                <div className="col-span-1 flex justify-self-center text-muted-foreground font-semibold">
                  Split Type
                </div>
                <div className="col-span-2 flex justify-self-center text-muted-foreground font-semibold">
                  Amount
                </div>
                <div className="col-span-2 flex justify-self-start text-muted-foreground font-semibold">
                  Created By
                </div>
                <div className="col-span-2 flex justify-self-end text-muted-foreground font-semibold">
                  My Shared
                </div>
                <div className="col-span-1" />
              </div>
              {(() => {
                const filteredExpenses = tripExpenses?.expenses?.filter(
                  (exp) =>
                    selectedTab === "myExpenses" ? exp.my_shared > 0 : true,
                );

                if (!filteredExpenses || filteredExpenses.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-accent/20 rounded-lg border border-dashed mt-4">
                      <p className="text-lg font-medium">No expenses found</p>
                      <p className="text-sm mt-1">
                        {selectedTab === "myExpenses"
                          ? "You haven't participated in any expenses yet."
                          : "There are no expenses in this trip yet."}
                      </p>
                    </div>
                  );
                }

                return filteredExpenses.map((exp) => {
                  return (
                    <ExpenseList
                      key={exp.expense_id}
                      expenseId={exp.expense_id}
                      title={exp.title}
                      amount={exp.amount}
                      myShared={exp.my_shared}
                      createdBy={exp.created_by}
                      ownerImmage={exp.owner_image}
                      imageUrl={exp.image_url}
                      splitType={exp.split_type}
                      participant={exp.participant.map((p) => ({
                        memberId: p.member_id,
                        name: p.name,
                        imageUrl: p.image_url,
                        amount: p.amount,
                      }))}
                      onClick={() => handleExpenseListCardClick(exp)}
                      onDelete={async () => {
                        await deleteExpense(
                          tripId,
                          { expense_id: exp.expense_id },
                          accessToken,
                        );
                        queryClient.invalidateQueries({
                          queryKey: expenseKeys.expensesByTrip(tripId),
                        });
                      }}
                    />
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
