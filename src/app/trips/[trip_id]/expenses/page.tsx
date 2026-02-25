"use client";

import ErrorCard from "@/components/common/ErrorCard";
import ProgressLoading from "@/components/ui/loading-animation";
import { useGetTripExpenses } from "@/hooks/expenses/use-get-trip-expenses";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import TotalExpenseAmount from "@/components/expense/total-amount-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseList from "@/components/expense/expense-list";
import UpsertExpenseDialog from "@/components/expense/upsert-expense-dialog";
import { ExpenseSchema } from "@/services/schemas/expense";
import z from "zod";

export default function Expenses() {
  const router = useRouter();
  const params = useParams();
  const tripId = parseInt(params.trip_id as string);

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
    <div className="min-h-screen bg-gray-50">
      {/* Expense detail dialog */}
      <UpsertExpenseDialog
        expense={selectedExpense}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        tripId={tripId}
        accessToken={accessToken}
      />

      {/* Main */}
      <main className="flex-1 pt-10 pb-12 max-w-full">
        <div className="ml-12 mr-17">
          {/* heading */}
          <div className="grid grid-cols-2 mb-2">
            <div className="ml-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Expenses Management
              </h1>
              <p className="text-gray-600">
                Track your spending across your trip
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant="outline"
                size="lg"
                className="justify-self-end place-self-end"
                onClick={() => {
                  setSelectedExpense(undefined);
                  setIsDialogOpen(true);
                }}
              >
                Add New Expense
              </Button>
            </div>
          </div>

          {/* trip total amount, my total amount */}
          <div className="grid grid-cols-2 gap-5">
            {/* budget card */}
            <TotalExpenseAmount
              type="Trip Total Expense"
              amount={tripExpenses?.total_amount ?? 0}
              variant="green"
              avgPerDay={tripExpenses?.avg_per_day}
            />
            <TotalExpenseAmount
              type="My Total Expense"
              amount={tripExpenses?.my_total_amount ?? 0}
              variant="red"
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
                  className="font-semibold text-md text-gray-500"
                  value="allExpenses"
                >
                  All Expenses
                </TabsTrigger>
                <TabsTrigger
                  className="font-semibold text-md text-gray-500"
                  value="myExpenses"
                >
                  My Expenses
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* expenses lists */}
            <div className="my-2">
              <div className="grid grid-cols-9 w-full mb-2 px-5">
                <div className="col-span-3 text-gray-400 font-semibold">
                  Title
                </div>
                <div className="col-span-1 flex justify-self-center text-gray-400 font-semibold">
                  Split Type
                </div>
                <div className="col-span-2 flex justify-self-center text-gray-400 font-semibold">
                  Amount
                </div>
                <div className="col-span-2 flex justify-self-start text-gray-400 font-semibold">
                  Created By
                </div>
                <div className="col-span-1 flex justify-self-end text-gray-400 font-semibold">
                  My Shared
                </div>
              </div>
              {tripExpenses?.expenses
                .filter((exp) =>
                  selectedTab === "myExpenses" ? exp.my_shared > 0 : true,
                )
                .map((exp) => {
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
                    />
                  );
                })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
