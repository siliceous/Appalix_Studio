import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseClass = 'font-medium rounded-lg transition-colors'
  const variantClass = {
    default: 'bg-[#15A4AE] text-white hover:bg-[#0f8a93]',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5',
    ghost: 'hover:bg-gray-100 dark:hover:bg-white/10',
  }[variant]
  const sizeClass = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }[size]

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    />
  )
}
