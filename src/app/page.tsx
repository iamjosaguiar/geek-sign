import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  FileSignature,
  Send,
  Shield,
  Clock,
  Users,
  FileText,
  Zap,
  Lock,
  CheckCircle2,
  ArrowRight,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Easy Upload",
    description: "Upload PDFs in seconds. Drag and drop or browse to select your documents.",
  },
  {
    icon: FileSignature,
    title: "Drag & Drop Fields",
    description: "Place signature, initial, date, and text fields exactly where you need them.",
  },
  {
    icon: Send,
    title: "Send & Track",
    description: "Send documents to multiple recipients and track signing progress in real-time.",
  },
  {
    icon: Shield,
    title: "Legally Binding",
    description: "Compliant with ESIGN Act and UETA. Your signatures are legally enforceable.",
  },
  {
    icon: Clock,
    title: "Audit Trail",
    description: "Complete audit log with timestamps, IP addresses, and signing history.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite team members, share templates, and work together seamlessly.",
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Upload Your Document",
    description: "Upload any PDF document you need signed. Our system handles files up to 50MB.",
  },
  {
    step: 2,
    title: "Add Recipients & Fields",
    description: "Specify who needs to sign and where. Drag and drop signature fields onto your document.",
  },
  {
    step: 3,
    title: "Send for Signatures",
    description: "Recipients receive an email with a secure link to sign. No account required for signers.",
  },
  {
    step: 4,
    title: "Download Signed Document",
    description: "Once everyone signs, download the completed document with full audit trail.",
  },
];

const testimonials = [
  {
    quote: "Geek Sign has transformed how we handle contracts. What used to take days now takes minutes.",
    author: "Sarah Johnson",
    role: "CEO, TechStart Inc.",
    rating: 5,
  },
  {
    quote: "The simplest e-signature tool I've ever used. Clean interface and incredibly fast.",
    author: "Michael Chen",
    role: "Freelance Consultant",
    rating: 5,
  },
  {
    quote: "Perfect for our small team. Affordable pricing and all the features we need.",
    author: "Emily Rodriguez",
    role: "HR Manager, GrowthCo",
    rating: 5,
  },
];

const faqs = [
  {
    question: "Is Geek Sign legally binding?",
    answer: "Yes! Geek Sign is fully compliant with the ESIGN Act and UETA. Documents signed with Geek Sign are legally binding and enforceable.",
  },
  {
    question: "Do signers need an account?",
    answer: "No, signers don't need to create an account. They receive a secure link via email and can sign documents directly from their browser.",
  },
  {
    question: "What file formats are supported?",
    answer: "Currently, Geek Sign supports PDF documents up to 50MB in size.",
  },
  {
    question: "How secure are my documents?",
    answer: "All documents are encrypted in transit and at rest using industry-standard AES-256 encryption.",
  },
  {
    question: "Can I use Geek Sign for free?",
    answer: "Yes! Our free plan includes unlimited documents with all essential features.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">G</span>
            </div>
            <span className="text-lg font-semibold">Geek Sign</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4">
                Trusted by 10,000+ users
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Sign Documents Online,{" "}
                <span className="text-primary">Fast & Secure</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                The simplest way to get documents signed. Upload, add signature fields,
                send to recipients, and track everything in real-time.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start Signing for Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required. Free forever plan available.
              </p>
            </div>

            {/* Dashboard Preview */}
            <div className="mt-16 mx-auto max-w-5xl">
              <div className="rounded-xl border bg-background shadow-2xl overflow-hidden">
                <div className="border-b bg-muted/50 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                </div>
                <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Dashboard Preview</p>
                    <p className="text-sm">Your document management hub</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-24">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to get signatures
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features that make document signing effortless
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-none bg-muted/30">
                <div className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground mt-2">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-muted/30 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Get documents signed in 4 simple steps
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step) => (
                <div key={step.step} className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="container py-16">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">ESIGN Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <span className="text-sm font-medium">256-bit Encryption</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">SOC 2 Ready</span>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by teams everywhere
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-4">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="bg-muted/30 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <Badge variant="secondary" className="mb-4">FAQ</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
            </div>

            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-24">
          <div className="rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground md:px-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to start signing?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join thousands of users who trust Geek Sign for their document signing needs.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/signup">
                  Get Started for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">G</span>
                </div>
                <span className="text-lg font-semibold">Geek Sign</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Simple, secure, and legally binding electronic signatures for everyone.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} House of Geeks. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
