"use client";

interface TotalExpenseAmountProps {
  type: string;
  amount: number;
  variant?: "green" | "red";
  avgPerDay?: number;
}

const variantStyles = {
  green: {
    card: "bg-green-50/70 border-green-100",
    label: "text-green-800/70",
    amount: "text-green-900",
    sub: "text-green-700/57",
  },
  red: {
    card: "bg-rose-50/70 border-rose-100",
    label: "text-rose-700/70",
    amount: "text-rose-800",
    sub: "text-rose-600/70",
  },
};

export default function TotalExpenseAmount({
  type,
  amount,
  variant = "green",
  avgPerDay,
}: TotalExpenseAmountProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`flex flex-row justify-between gap-3 px-5 py-7 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 ${styles.card}`}
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
