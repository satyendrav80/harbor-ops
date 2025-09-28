import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';
import { ButtonHTMLAttributes } from 'react';

const styles = cva(
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-slate-600',
        ghost: 'bg-transparent hover:bg-slate-800 text-slate-100',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles> & { asChild?: boolean };

export function Button({ className, variant, size, children, ...rest }: Props) {
  const cls = twMerge(styles({ variant, size }), className);
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cls}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export default Button;
