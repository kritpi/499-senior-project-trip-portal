"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UpsertExpenseSchema,
  UpsertExpenseFormValues,
} from "@/services/schemas/expense";
import { ExpenseSchema } from "@/services/schemas/expense";
import z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTripMembers } from "@/hooks/trip/use-get-trip-members";
import { useUpdateExpense } from "@/hooks/expenses/use-update-expense";
import { uploadImage } from "@/services/api/upload/upload-image";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

type UpsertExpenseDialogProps = {
  expense: z.infer<typeof ExpenseSchema> | undefined;
  isDialogOpen: boolean;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tripId: number;
  accessToken: string;
  isViewer?: boolean;
};

const EMPTY_FORM_VALUES: UpsertExpenseFormValues = {
  title: "",
  amount: 0,
  image_url: "",
  split_type: "ALL_EQUAL",
  participant: [],
};

export default function UpsertExpenseDialog({
  expense,
  isDialogOpen,
  setIsDialogOpen,
  tripId,
  accessToken,
  isViewer,
}: UpsertExpenseDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("step1");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: tripMembers, isLoading: isMembersLoading } = useGetTripMembers(
    tripId,
    accessToken,
    { staleTime: 5 * 60 * 1000 }, // cache for 5 min — members don't change during dialog interaction
  );

  const { mutate: updateExpense, isPending: isSaving } = useUpdateExpense();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpsertExpenseFormValues>({
    resolver: zodResolver(UpsertExpenseSchema),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const watchedSplitType = watch("split_type");
  const watchedParticipants = watch("participant");
  const showSelectedEqualWarning =
    watchedSplitType === "SELECTED_EQUAL" && watchedParticipants.length === 0;

  // Pre-fill form when expense changes
  useEffect(() => {
    if (expense) {
      reset({
        title: expense.title,
        amount: expense.amount,
        image_url: expense.image_url,
        split_type: expense.split_type,
        participant: expense.participant.map((p) => ({
          member_id: p.member_id,
          name: p.name,
          image_url: p.image_url,
          amount: p.amount,
        })),
      });
      setImagePreview(expense.image_url);
    } else {
      // Reset to blank defaults for "Add New Expense"
      reset(EMPTY_FORM_VALUES);
      setImagePreview("");
    }
    setActiveTab("step1");
  }, [expense, reset]);

  // Ensure form clears when opening "Add New Expense" repeatedly
  useEffect(() => {
    if (isDialogOpen && !expense) {
      reset(EMPTY_FORM_VALUES);
      setImagePreview("");
      setActiveTab("step1");
    }
  }, [isDialogOpen, expense, reset]);

  // Auto-select all members when split type is ALL_EQUAL
  useEffect(() => {
    if (watchedSplitType === "ALL_EQUAL" && tripMembers?.members) {
      setValue(
        "participant",
        tripMembers.members.map((m) => ({
          member_id: m.member_id,
          name: m.name,
          image_url: m.image_url,
          amount: 0,
        })),
      );
    }
  }, [watchedSplitType, tripMembers, setValue]);

  // Image upload handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { image_url } = await uploadImage(file, accessToken);
      setValue("image_url", image_url);
      setImagePreview(image_url);
    } catch (err) {
      console.error("Image upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setValue("image_url", "");
    setImagePreview("");
  };

  // Member selection helpers
  const isParticipantSelected = (memberId: string) =>
    watchedParticipants.some((p) => p.member_id === memberId);

  const toggleMember = (member: {
    member_id: string;
    name: string;
    image_url: string;
  }) => {
    if (watchedSplitType === "ALL_EQUAL") {
      return;
    }
    const current = watchedParticipants;
    if (isParticipantSelected(member.member_id)) {
      setValue(
        "participant",
        current.filter((p) => p.member_id !== member.member_id),
      );
    } else {
      setValue("participant", [
        ...current,
        {
          member_id: member.member_id,
          name: member.name,
          image_url: member.image_url,
          amount: 0,
        },
      ]);
    }
  };

  const updateParticipantAmount = (memberId: string, amount: number) => {
    setValue(
      "participant",
      watchedParticipants.map((p) =>
        p.member_id === memberId ? { ...p, amount } : p,
      ),
    );
  };

  const onSubmit = (data: UpsertExpenseFormValues) => {
    console.log("submitted", data);
    updateExpense(
      {
        trip_id: tripId,
        body: { expense_id: expense?.expense_id ?? "", ...data },
        access_token: accessToken,
      },
      { onSuccess: () => setIsDialogOpen(false) },
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => setIsDialogOpen(open)}>
      <DialogContent showCloseButton={true} className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pl-2">Expense Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="step1">Information</TabsTrigger>
              <TabsTrigger value="step2">Upload Receipt</TabsTrigger>
              <TabsTrigger value="step3">Member</TabsTrigger>
            </TabsList>

            {/* ── Step 1: Information ── */}
            <TabsContent value="step1">
              <div className="rounded-md border bg-card p-6 text-card-foreground shadow-sm space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Dinner at Sukhumvit"
                    disabled={isViewer}
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (THB)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={isViewer}
                    {...register("amount", { valueAsNumber: true })}
                  />
                  {errors.amount && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.amount.message}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Step 2: Upload Receipt ── */}
            <TabsContent value="step2">
              <div className="rounded-md border bg-card p-6 text-card-foreground shadow-sm space-y-4">
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="w-full h-72 object-contain rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className={isViewer ? "hidden" : "absolute top-2 right-2"}
                      onClick={clearImage}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  !isViewer && (
                    <label
                      htmlFor="receipt-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/40 rounded-lg cursor-pointer hover:border-primary/60 transition-colors bg-muted/30"
                    >
                      {isUploading ? (
                        <Loader2 className="size-8 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="size-10 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload receipt
                          </span>
                          <span className="text-xs text-muted-foreground/70 mt-1">
                            PNG, JPG, WEBP accepted
                          </span>
                        </>
                      )}
                      <input
                        id="receipt-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={isUploading}
                      />
                    </label>
                  )
                )}

                {!imagePreview && !isViewer && (
                  <p className="text-xs text-muted-foreground text-center">
                    Image upload is optional. You can skip this step.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* ── Step 3: Members ── */}
            <TabsContent value="step3">
              <div className="rounded-md border bg-card p-6 text-card-foreground shadow-sm space-y-5">
                {/* Split type */}
                <div className="space-y-1.5">
                  <Label>Split Type</Label>
                  <Controller
                    control={control}
                    name="split_type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isViewer}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select split type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL_EQUAL">All Equal</SelectItem>
                          <SelectItem value="SELECTED_EQUAL">
                            Selected Equal
                          </SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Members list */}
                <div className="space-y-2">
                  <Label>Participants</Label>
                  {isMembersLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                      <Loader2 className="size-4 animate-spin" />
                      Loading members…
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {/* {tripMembers?.map((member) => { */}
                      {tripMembers?.members.map((member) => {
                        const selected = isParticipantSelected(
                          member.member_id,
                        );
                        const participant = watchedParticipants.find(
                          (p) => p.member_id === member.member_id,
                        );
                        return (
                          <div
                            key={member.member_id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${!isViewer && "cursor-pointer"} transition-colors ${
                              selected
                                ? "border-primary/60 bg-primary/5"
                                : "border-border hover:bg-muted/40"
                            }`}
                            onClick={() =>
                              !isViewer &&
                              watchedSplitType !== "ALL_EQUAL" &&
                              toggleMember(member)
                            }
                          >
                            {/* Avatar */}
                            {member.image_url ? (
                              <img
                                src={member.image_url}
                                alt={member.name}
                                className="size-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.email}
                              </p>
                            </div>

                            {/* Custom amount input */}
                            {selected && watchedSplitType === "CUSTOM" && (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                className="w-28 h-7 text-sm"
                                value={participant?.amount ?? 0}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isViewer}
                                onChange={(e) =>
                                  updateParticipantAmount(
                                    member.member_id,
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            )}

                            {/* Checkbox indicator */}
                            <div
                              className={`size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                selected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {selected && (
                                <svg
                                  className="size-3 text-primary-foreground"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {showSelectedEqualWarning && (
                    <p className="text-destructive text-xs">
                      Please select at least one member.
                    </p>
                  )}
                  {errors.participant && (
                    <p className="text-destructive text-xs">
                      {errors.participant.message}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-4">
            <Button
              type="button"
              variant="outline"
              disabled={activeTab === "step1"}
              onClick={() => {
                if (activeTab === "step2") setActiveTab("step1");
                if (activeTab === "step3") setActiveTab("step2");
              }}
            >
              Previous
            </Button>

            {activeTab === "step3" ? (
              !isViewer && (
                <Button
                  type="button"
                  variant="default"
                  disabled={isSaving}
                  onClick={() => handleSubmit(onSubmit)()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              )
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (activeTab === "step1") setActiveTab("step2");
                  if (activeTab === "step2") setActiveTab("step3");
                }}
              >
                Next
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
