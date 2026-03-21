import { cva } from "class-variance-authority";

// Pinterest-style button variants
export const pinterestButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary-hover active:bg-primary-active",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Pinterest-specific variants
        pinterest: "bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active shadow-elegant hover:shadow-hover transition-all duration-200",
        "pinterest-outline": "border-2 border-primary text-primary bg-white hover:bg-primary hover:text-white font-semibold transition-all duration-200",
        "pinterest-gray": "bg-gray-100 text-gray-800 hover:bg-gray-200 font-medium",
        "pinterest-black": "bg-gray-900 text-white hover:bg-gray-800 font-semibold shadow-soft hover:shadow-elegant",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-full px-3 text-xs",
        lg: "h-10 rounded-full px-8",
        icon: "h-9 w-9",
        pill: "h-8 px-4 rounded-full text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);