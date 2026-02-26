import { Avatar } from "@/components/ui/avatar";
import { X } from "lucide-react";

// interface ExpenseSchemaProps {
//   expenseId: string;
//   title: string;
//   amount: number;
//   myShared: number;
//   createdBy: string;
//   ownerImmage: string;
//   imageUrl: string;
//   splitType: string;
//   participant: ParticipantProps[];
//   onClick?: () => void;
// }

// interface ParticipantProps {
//   memberId: string;
//   name: string;
//   imageUrl: string;
//   amount: number;
// }

const splitTypeConfig: Record<string, { label: string; className: string }> = {
  CUSTOM: {
    label: "Custom Split",
    className: "bg-violet-100/70 text-violet-600 border border-violet-200/60",
  },
  ALL_EQUAL: {
    label: "Split Equally",
    className: "bg-sky-100/70 text-sky-600 border border-sky-200/60",
  },
  SELECTED_EQUAL: {
    label: "Selected Equal",
    className: "bg-amber-100/70 text-amber-600 border border-amber-200/60",
  },
};

export default function ExpenseList(props: ExpenseSchemaProps) {
  const split = splitTypeConfig[props.splitType];

  return (
    <div
      onClick={props.onClick}
      className="relative grid grid-cols-11 items-center w-full px-5 py-4 mb-3 border border-stone-200/80 rounded-xl bg-stone-100/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Title */}
      <div className="col-span-3 flex flex-col gap-1 min-w-0">
        <span className="text-sm font-semibold text-stone-700 truncate">
          {props.title}
        </span>
      </div>

      {/* Split type badge — own column */}
      <div className="col-span-1 flex justify-self-center">
        {split ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${split.className}`}
          >
            {split.label}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-stone-100 text-stone-400 border border-stone-200/60">
            {props.splitType}
          </span>
        )}
      </div>

      {/* Total amount */}
      <div className="col-span-2 flex justify-self-center text-sm font-semibold text-stone-600">
        ฿{" "}
        {props.amount.toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>

      {/* Owner */}
      <div className="col-span-2 flex justify-self-start items-center gap-1.5">
        <Avatar src={props.ownerImmage} alt={props.createdBy} size="sm" />
        <span className="text-xs text-stone-500 truncate ">
          {props.createdBy}
        </span>
      </div>

      {/* My share */}
      <div className="col-span-2 flex justify-self-end flex-col items-end">
        <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">
          My share
        </span>
        <span className="text-sm font-bold text-stone-700">
          ฿{" "}
          {props.myShared.toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>

      {/* Delete button */}
      <div className="col-span-1 flex justify-self-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete?.();
          }}
          className="p-1.5 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
          aria-label="Delete expense"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
