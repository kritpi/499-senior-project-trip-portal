import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  error: Error | unknown;
  title?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export default function ErrorCard({ 
  error, 
  title = "Something went wrong",
  onAction, 
  actionLabel = "Try Again" 
}: ErrorCardProps) {
  // Parse error message
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === "string") {
      return err;
    }
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
    return "An unexpected error occurred";
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="fixed inset-0 flex justify-center items-center w-full px-4 bg-background/80 backdrop-blur-sm z-50">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <p className="text-muted-foreground">
            {errorMessage}
          </p>
          {onAction && (
            <Button onClick={onAction} variant="outline">
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
