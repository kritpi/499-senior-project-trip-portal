"use client"
import * as React from "react"
import { Progress } from "@/components/ui/progress"

export default function ProgressLoading() {
  const [progress, setProgress] = React.useState(0)
  const [status, setStatus] = React.useState("Loading...")

  React.useEffect(() => {
    // Start loading animation on mount
    setProgress(0)
    setStatus("Connecting to server...")
    
    // Simulate different loading stages
    const timer1 = setTimeout(() => {
      setProgress(25)
      setStatus("Fetching data...")
    }, 500)
    
    const timer2 = setTimeout(() => {
      setProgress(50)
      setStatus("Processing results...")
    }, 1200)
    
    const timer3 = setTimeout(() => {
      setProgress(75)
      setStatus("Preparing display...")
    }, 2000)
    
    const timer4 = setTimeout(() => {
      setProgress(100)
      setStatus("Complete!")
    }, 3000)

    // Cleanup timers on unmount
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
    }
  }, [])

  return (
    <div className="fixed inset-0 flex justify-center items-center w-full px-4 bg-background/80 backdrop-blur-sm z-50">
      <div className="w-full max-w-md space-y-3">
        <Progress value={progress} className="w-full" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{status}</p>
          {progress < 100 && (
            <p className="text-xs text-muted-foreground mt-1">
              Please wait...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
