import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
    
    const variants = {
      default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 border border-primary/10",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-secondary/20",
      outline: "border border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground hover:border-primary/50",
      ghost: "hover:bg-muted hover:text-foreground border border-transparent",
      link: "text-primary underline-offset-4 hover:underline border-transparent",
    }
    
    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-8",
      icon: "h-9 w-9",
    }

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
