import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-brand-navy/5 bg-white/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal shadow-sm group-hover:shadow-teal transition-shadow">
              <span className="text-sm font-bold text-white">G</span>
            </div>
            <span className="text-lg font-semibold text-brand-navy">Geek Sign</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className="text-sm font-medium text-muted-foreground hover:text-brand-navy transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-brand-navy transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/#faq"
              className="text-sm font-medium text-muted-foreground hover:text-brand-navy transition-colors"
            >
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-brand-navy" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button className="shadow-sm hover:shadow-teal transition-shadow" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-brand-navy/5 bg-white">
        <div className="container py-16">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal shadow-sm">
                  <span className="text-sm font-bold text-white">G</span>
                </div>
                <span className="text-lg font-semibold text-brand-navy">Geek Sign</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Simple, secure, and legally binding electronic signatures for everyone.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-brand-navy mb-4">Product</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/#features" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-brand-navy mb-4">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/compliance" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    Compliance
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-brand-navy mb-4">Company</h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-brand-teal transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-brand-navy/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} House of Geeks. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              A product of <span className="text-brand-teal font-medium">House of Geeks</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
