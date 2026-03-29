import Link from "next/link";
import { Logo } from "@/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-background rounded-xl p-8">
        <Link href="/" className="inline-flex mb-6">
          <Logo size="md" showWordmark />
        </Link>
        {children}
      </div>
    </div>
  );
}
