import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const buttonVariants = cva(
  "group/button pressable inline-flex shrink-0 items-center justify-center rounded-full text-sm font-medium whitespace-nowrap outline-none select-none focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'button-raised hover:brightness-110',
        outline: 'button-raised-soft hover:brightness-[0.98]',
        secondary: 'button-raised-soft hover:brightness-[0.98]',
        ghost:
          'text-foreground hover:button-raised-soft aria-expanded:button-raised-soft',
        destructive: 'button-raised-alert hover:brightness-[0.98]',
        link: 'rounded-none text-primary underline-offset-4 hover:underline',
      },
      size: {
        default:
          'h-[42px] gap-1.5 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5',
        xs: "h-[38px] gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[38px] gap-1 px-3.5 text-[0.8125rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-[46px] gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        touch:
          'h-[46px] min-h-[46px] gap-2 px-5 text-base font-medium has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-[42px]',
        'icon-xs': "size-[38px] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-[38px]',
        'icon-lg': 'size-[46px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
