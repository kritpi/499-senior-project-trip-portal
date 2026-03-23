interface ExpenseSchemaProps {
  expenseId: string;
  title: string;
  amount: number;
  myShared: number;
  createdBy: string;
  ownerImmage: string;
  imageUrl: string;
  splitType: string;
  participant: ParticipantProps[];
  onClick?: () => void;
  onDelete?: () => void;
}

interface ParticipantProps {
  memberId: string;
  name: string;
  imageUrl: string;
  amount: number;
}