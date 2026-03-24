import Link from "next/link";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 flex items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center">
          <Logo size="sm" showWordmark />
        </Link>
      </header>

      {/* Form Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
