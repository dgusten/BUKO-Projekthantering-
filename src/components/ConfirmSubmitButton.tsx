"use client";

export default function ConfirmSubmitButton({
  className,
  confirmText,
  children,
}: {
  className?: string;
  confirmText: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
