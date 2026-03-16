"use client";

interface TotalExpenseAmountProps {
  type: string;
  amount: number;
  variant?: "primary" | "destructive";
  avgPerDay?: number;
}

const variantStyles = {
  primary: {
    card: "border-l-4 border-l-primary",
    label: "text-muted-foreground",
    amount: "text-card-foreground",
    sub: "text-muted-foreground",
  },
  destructive: {
    card: "border-l-4 border-l-destructive",
    label: "text-muted-foreground",
    amount: "text-card-foreground",
    sub: "text-muted-foreground",
  },
};

export default function TotalExpenseAmount({
  type,
  amount,
  variant = "primary",
  avgPerDay,
}: TotalExpenseAmountProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`flex flex-row justify-between gap-3 px-5 py-7 rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 ${styles.card}`}
    >
      <div>
        {/* Label */}
        <p
          className={`text-sm font-semibold tracking-widest uppercase mb-2 ${styles.label}`}
        >
          {type}
        </p>

        {/* Amount */}
        <p className={`text-3xl font-bold tracking-tight ${styles.amount}`}>
          ฿{" "}
          {amount.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      <div className="place-self-end">
        {/* Avg per day */}
        {avgPerDay !== undefined && (
          <div>
            <div className={`text-sm font-bold place-self-end ${styles.sub}`}>
              Avg.
            </div>
            <span className={`font-bold ${styles.sub}`}>
              {" "}
              ฿
              {avgPerDay.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              Per Day
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
