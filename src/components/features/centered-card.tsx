import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card"

export default function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="container mx-auto py-8 flex justify-center">
      <Card className="w-full max-w-xl">
        <CardContent className="min-h-[300px] flex flex-col items-center justify-center gap-4">
          {children}
        </CardContent>
      </Card>
    </main>
  )
}
