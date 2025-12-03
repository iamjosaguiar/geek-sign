import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    answer: "Yes! Geek Sign is fully compliant with the ESIGN Act (Electronic Signatures in Global and National Commerce Act) and UETA (Uniform Electronic Transactions Act). Documents signed with Geek Sign are legally binding and enforceable in the United States and most countries worldwide.",
  },
  {
    question: "Do signers need an account?",
    answer: "No, signers don't need to create an account. They receive a secure link via email and can sign documents directly from their browser. Only document senders need a Geek Sign account.",
  },
  {
    question: "What file formats are supported?",
    answer: "Currently, Geek Sign supports PDF documents. You can upload PDFs up to 50MB in size. We're working on adding support for additional formats in the future.",
  },
  {
    question: "How secure are my documents?",
    answer: "We take security seriously. All documents are encrypted in transit and at rest using industry-standard AES-256 encryption. We maintain complete audit trails and never share your documents with third parties.",
  },
  {
    question: "Can I use Geek Sign for free?",
    answer: "Yes! Our free plan includes 3 documents per month with unlimited signatures. It's perfect for occasional use. For higher volumes, check out our Starter and Team plans.",
  },
  {
    question: "What happens after a document expires?",
    answer: "You can set expiration dates for documents. If a document expires before all signatures are collected, it becomes invalid and cannot be signed. You can always send a new signing request.",
  },
];

export default function HomePage() {
  return (
    <div>
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
              No credit card required. 3 free documents per month.
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
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
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
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              How It Works
            </Badge>
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
            <span className="text-sm font-medium">ESIGN Act & UETA Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <span className="text-sm font-medium">Secure Cloud Storage</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-5 w-5" />
            <span className="text-sm font-medium">Instant Delivery</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Complete Audit Trail</span>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container py-24">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Testimonials
          </Badge>
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
                    <Star
                      key={i}
                      className="h-5 w-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <blockquote className="text-lg mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
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
            <Badge variant="secondary" className="mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
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
    </div>
  );
}
