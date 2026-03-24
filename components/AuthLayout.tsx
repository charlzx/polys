import Link from "next/link";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-6">
      <div className="w-full max-w-md bg-card rounded-xl p-8 shadow-sm">
        <Link href="/" className="inline-flex mb-6">
          <Logo size="md" showWordmark />
        </Link>
        {children}
      </div>
    </div>
  );
}
