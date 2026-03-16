"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useUpsertTrip } from "@/hooks/trip/use-upsert-trip";
import { useUploadImage } from "@/hooks/upload/use-upload-image";
import { useForm } from "react-hook-form";
import z from "zod";
import {
  UpsertTripReqSchema,
  UpsertTripRequest,
} from "@/services/schemas/trip";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  MapPin,
  Upload,
  FileText,
  X,
  Calendar as CalendarIcon,
  Plane,
  AlignLeft,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type FormValues = z.infer<typeof UpsertTripReqSchema>;

interface TripFormProps {
  isNewTrip: boolean;
  tripId: number | "create";
  accessToken: string;
  initialData?: Partial<UpsertTripRequest> & {
    trip_name: string;
    start_date: string;
    end_date: string;
    main_location: string;
  };
  onSubmit?: (data: FormValues) => void;
  onFormChange?: (data: FormValues) => void;
  isViewer?: boolean;
}

export interface TripFormRef {
  validateForm: () => Promise<boolean>;
  getFormData: () => FormValues;
}

const TripForm = forwardRef<TripFormRef, TripFormProps>(function TripForm(
  {
    isNewTrip,
    tripId,
    accessToken,
    initialData,
    onSubmit: externalOnSubmit,
    onFormChange,
    isViewer,
  },
  ref,
) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>();
  const [coverImage, setCoverImage] = useState<string>("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const emptyTripValues: UpsertTripRequest = {
    trip_name: "",
    description: "",
    start_date: "",
    end_date: "",
    main_location: "",
    image_url: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(UpsertTripReqSchema),
    defaultValues: emptyTripValues,
  });

  const upsertTrip = useUpsertTrip();
  const uploadImage = useUploadImage();

  // Expose validation method to parent component
  useImperativeHandle(ref, () => ({
    validateForm: async () => {
      const result = await form.trigger();
      return result;
    },
    getFormData: () => {
      return form.getValues();
    },
  }));

  // Populate form when initialData is provided
  useEffect(() => {
    if (initialData) {
      form.reset({
        trip_id: initialData.trip_id,
        trip_name: initialData.trip_name,
        description: initialData.description,
        start_date: initialData.start_date,
        end_date: initialData.end_date,
        main_location: initialData.main_location,
        image_url: (initialData as any).image_url || "",
      });

      // Also populate the dateRange state for the calendar
      if (initialData.start_date && initialData.end_date) {
        setDateRange({
          from: new Date(initialData.start_date),
          to: new Date(initialData.end_date),
        });
      }

      // Set the image from API if available
      if ((initialData as any).image_url) {
        setUploadedImageUrl((initialData as any).image_url);
        setCoverImage((initialData as any).image_url);
      }
    }
  }, [initialData, form]);

  // Watch for form changes and notify parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (onFormChange && value) {
        // Include the uploaded image URL with the form data
        const dataWithImage = {
          ...value,
          ...(uploadedImageUrl ? { image_url: uploadedImageUrl } : {}),
        } as FormValues;
        onFormChange(dataWithImage);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onFormChange, uploadedImageUrl]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setIsUploadingImage(true);
      console.log("📤 Starting image upload...");

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      try {
        const response = await uploadImage.mutateAsync({
          image: file,
          access_token: accessToken,
        });
        console.log("✅ Image uploaded successfully! URL:", response.image_url);
        setUploadedImageUrl(response.image_url);
        // Update the preview to the uploaded URL
        setCoverImage(response.image_url);

        // Update form value so Zod validation works
        form.setValue("image_url", response.image_url, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
        console.log("✅ Form image_url set to:", form.getValues("image_url"));

        // Notify parent about the new image URL
        if (onFormChange) {
          const currentFormValues = form.getValues();
          onFormChange({
            ...currentFormValues,
            image_url: response.image_url,
          } as FormValues);
        }
      } catch (error) {
        console.error("❌ Failed to upload image:", error);
        // Keep the local preview if upload fails
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleRemoveImage = () => {
    setCoverImage("");
    setCoverImageFile(null);
    setUploadedImageUrl("");

    // Update form value
    form.setValue("image_url", "");

    // Notify parent that image was removed
    if (onFormChange) {
      const currentFormValues = form.getValues();
      onFormChange({
        ...currentFormValues,
        image_url: "",
      } as FormValues);
    }
  };

  const onSubmit = (data: FormValues) => {
    console.log("📝 Form submitted with data:", data);
    console.log("📝 uploadedImageUrl state:", uploadedImageUrl);
    console.log("📝 form.getValues('image_url'):", form.getValues("image_url"));

    // Validate that image is uploaded
    if (!uploadedImageUrl) {
      console.error("❌ Image is required");
      return;
    }

    // Create complete data with image_url
    const completeData = {
      ...data,
      image_url: uploadedImageUrl,
    } as FormValues;

    console.log("📝 completeData:", completeData);

    // Update parent state if callback is provided
    if (externalOnSubmit) {
      externalOnSubmit(completeData);
    }

    const payload: UpsertTripRequest = {
      ...(typeof tripId === "number" && tripId > 0 ? { trip_id: tripId } : {}),
      trip_name: data.trip_name,
      ...(data.description
        ? { description: data.description }
        : { description: "" }),
      start_date: data.start_date,
      end_date: data.end_date,
      main_location: data.main_location,
      image_url: uploadedImageUrl,
    };

    console.log("payload: ", payload);
    console.log("access token: ", accessToken);

    upsertTrip.mutate(
      { payload, access_token: accessToken },
      {
        onSuccess: (response) => {
          console.log("✅ Trip saved successfully! Response:", response);
          // Navigate to the trip page with the returned trip_id
          const savedTripId =
            response?.trip_id || (typeof tripId === "number" ? tripId : 0);
          router.push(`/trips/${savedTripId}`);
        },
        onError: (error) => {
          console.error("❌ Failed to save trip:", error);
        },
      },
    );
  };

  const onFormError = (errors: any) => {
    console.error("❌ Form validation errors:", errors);
  };

  return (
    <div>
      <form
        onSubmit={form.handleSubmit(onSubmit, onFormError)}
        className="space-y-6"
      >
        {/* Trip Details Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">
              Trip Details
            </h2>
            {isViewer && (
              <Badge variant="outline" className="ml-2 py-1">
                View Only
              </Badge>
            )}
            <Badge variant="outline" className="ml-auto">
              STEP 1 OF 3
            </Badge>
          </div>

          <FieldGroup>
            {/* Row 1: Trip Name + Destination */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Trip Name</FieldLabel>
                <div className="relative">
                  <Plane className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. Autumn in Tuscany"
                    className="pl-10"
                    disabled={isViewer}
                    {...form.register("trip_name")}
                  />
                </div>
                <FieldError errors={[form.formState.errors.trip_name]} />
              </Field>

              <Field>
                <FieldLabel>Destination</FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. Bangkok, Thailand"
                    className="pl-10"
                    disabled={isViewer}
                    {...form.register("main_location")}
                  />
                </div>
                <FieldError errors={[form.formState.errors.main_location]} />
              </Field>
            </div>

            {/* Row 2: Description (full width) */}
            <Field>
              <FieldLabel>Trip Description</FieldLabel>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Textarea
                  placeholder="What's the soul of this journey?"
                  rows={4}
                  className="pl-10"
                  disabled={isViewer}
                  {...form.register("description")}
                />
              </div>
              <FieldError errors={[form.formState.errors.description]} />
            </Field>

            {/* Row 4: Date Range (full width) */}
            <Field>
              <FieldLabel>Date Range</FieldLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={isViewer}
                    className={cn(
                      "w-full justify-start text-left font-normal border border-input rounded-md px-3 py-2 text-sm transition-colors",
                      !dateRange ? "text-muted-foreground" : "",
                      !isViewer
                        ? "hover:bg-accent cursor-pointer"
                        : "cursor-not-allowed opacity-50",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 inline" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Select dates</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from) {
                        form.setValue(
                          "start_date",
                          range.from.toISOString().split("T")[0],
                        );
                      }
                      if (range?.to) {
                        form.setValue(
                          "end_date",
                          range.to.toISOString().split("T")[0],
                        );
                      }
                    }}
                    numberOfMonths={2}
                    className="rounded-md"
                  />
                </PopoverContent>
              </Popover>
              <FieldError
                errors={[
                  form.formState.errors.start_date,
                  form.formState.errors.end_date,
                ]}
              />
            </Field>

            {/* Row 5: Image Upload (full width) */}
            <Field>
              <FieldLabel>Thumbnail Image</FieldLabel>
              <div className="border border-border rounded-md p-3 min-h-[400px] flex flex-col items-center justify-center">
                {coverImage ? (
                  <div className="relative w-full">
                    <img
                      src={coverImage}
                      alt="Trip cover"
                      className="w-full h-auto rounded-md"
                    />
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <Loader2 className="size-8 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className={cn(
                        "absolute top-2 right-2 p-1 bg-card rounded-full shadow-md hover:bg-muted",
                        isViewer ? "hidden" : "",
                      )}
                      disabled={isUploadingImage || isViewer}
                    >
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  !isViewer && (
                    <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                      <Upload className="size-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground mb-1">
                        Upload Cover Image
                      </span>
                      <span className="text-xs text-muted-foreground">
                        IMAGE PREVIEW
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )
                )}
              </div>
              <FieldError errors={[form.formState.errors.image_url]} />
            </Field>
          </FieldGroup>

          {/* Save Button */}
          {!isViewer && (
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                type="submit"
                variant={"default"}
                disabled={form.formState.isSubmitting}
                size="lg"
                className="px-8 w-full"
              >
                {form.formState.isSubmitting ? "Saving..." : "Save Trip"}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
});

export default TripForm;
