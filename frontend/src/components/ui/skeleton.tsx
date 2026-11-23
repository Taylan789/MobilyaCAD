import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("motion-safe:animate-pulse motion-reduce:animate-none rounded-md bg-muted", className)}
    />
  )
}

export { Skeleton }
