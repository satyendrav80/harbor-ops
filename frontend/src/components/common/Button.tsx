import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';
import { ButtonHTMLAttributes } from 'react';

const styles = cva(
  'block w-full box-border rounded-[10px] border border-transparent px-4 py-3 text-sm font-semibold tracking-wide text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-[#5ea4ff] via-[#3b82f6] to-[#2355da] text-white shadow-[0_10px_24px_rgba(59,130,246,0.38)] hover:shadow-[0_16px_32px_rgba(37,99,235,0.45)] focus-visible:ring-[#5ea4ff]',
        secondary:
          'bg-[#151f36] text-slate-200 border border-[#2b3857] hover:border-[#5ea4ff] hover:text-white focus-visible:ring-[#3b82f6]',
        ghost: 'bg-transparent text-slate-200 hover:bg-[#1a2340] focus-visible:ring-[#3b82f6]',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-3 text-sm',
        lg: 'px-5 py-3.5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles> & { asChild?: boolean };

export function Button({ className, variant, size, children, ...rest }: Props) {
  const cls = twMerge(styles({ variant, size }), className);
  return (
    <motion.button whileTap={{ scale: 0.985 }} className={cls} {...rest}>
      {children}
    </motion.button>
  );
}

export default Button;
