export const siteConfig = {
  name: "Geek Sign",
  description:
    "The easiest way to send and sign documents online—completely free. Send unlimited documents for e-signature, track status in real time, and streamline your workflow.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og-image.png",
  links: {
    twitter: "https://twitter.com/houseofgeeks",
    github: "https://github.com/houseofgeeks",
  },
  creator: "House of Geeks",
};

export const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export const footerLinks = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/blog", label: "Blog" },
  ],
  legal: [
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/refunds", label: "Refund Policy" },
  ],
  support: [
    { href: "mailto:support@geeksign.app", label: "Contact Us" },
    { href: "/docs", label: "API Documentation" },
  ],
};
