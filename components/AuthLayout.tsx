interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
