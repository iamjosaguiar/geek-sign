import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Geek Sign",
  description: "Privacy Policy for Geek Sign electronic signature platform",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl py-16">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: December 2, 2024</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            House of Geeks (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates Geek Sign, an electronic
            signature platform. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our Service. Please read this policy
            carefully to understand our practices regarding your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <h3 className="text-lg font-medium text-foreground">Account Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name and email address</li>
              <li>Company name (optional)</li>
              <li>Password (encrypted)</li>
              <li>Profile information</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">Document Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Documents you upload for signing</li>
              <li>Signature data and field values</li>
              <li>Recipient information (names and email addresses)</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">Signing Activity Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address at time of signing</li>
              <li>Browser and device information (user agent)</li>
              <li>Timestamps of all actions (viewing, signing, consent)</li>
              <li>ESIGN consent records</li>
              <li>Audit trail information</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6">Usage Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pages visited and features used</li>
              <li>Session duration and frequency</li>
              <li>Error logs and diagnostic data</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process and facilitate electronic signatures</li>
              <li>Maintain legally compliant audit trails</li>
              <li>Send transactional emails (signing requests, confirmations)</li>
              <li>Respond to customer support requests</li>
              <li>Improve and optimize the Service</li>
              <li>Detect and prevent fraud or security issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>We process your personal data based on:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contract Performance:</strong> To provide the Service you requested</li>
              <li><strong>Legitimate Interests:</strong> To improve our Service and prevent fraud</li>
              <li><strong>Legal Compliance:</strong> To maintain required records under ESIGN Act</li>
              <li><strong>Consent:</strong> Where you have provided explicit consent</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>We retain your data according to the following schedule:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Documents:</strong> Minimum 7 years after signing (legal compliance)</li>
              <li><strong>Audit Logs:</strong> Retained indefinitely for legal proof</li>
              <li><strong>Account Data:</strong> Until account deletion, plus 30 days</li>
              <li><strong>Consent Records:</strong> Retained with associated documents</li>
            </ul>
            <p className="mt-4">
              We retain data longer if required by law or to resolve disputes. You may request
              earlier deletion, subject to our legal obligations.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>We implement security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data transmitted via HTTPS/TLS encryption</li>
              <li>Secure cloud storage (Vercel Blob, Neon PostgreSQL)</li>
              <li>Access controls and authentication</li>
              <li>Regular security audits and monitoring</li>
              <li>Encrypted password storage</li>
            </ul>
            <p className="mt-4">
              While we strive to protect your data, no method of transmission over the Internet
              is 100% secure. We cannot guarantee absolute security.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Information Sharing</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Document Recipients:</strong> When you send documents for signing</li>
              <li><strong>Service Providers:</strong> Cloud hosting (Vercel), email (SendGrid), database (Neon)</li>
              <li><strong>Legal Authorities:</strong> When required by law or legal process</li>
              <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal information to third parties.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to retention requirements)</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at privacy@houseofgeeks.com.au.
              Note that some requests may be limited by our legal obligations to retain records.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Cookies and Tracking</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>We use essential cookies to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain your login session</li>
              <li>Remember your preferences</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
            <p className="mt-4">
              We do not use third-party advertising or tracking cookies.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Service is hosted in the United States. If you access the Service from outside
            the US, your data will be transferred to and processed in the US. By using the
            Service, you consent to this transfer.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our Service is not intended for children under 18. We do not knowingly collect
            personal information from children. If we learn we have collected data from a
            child, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of
            material changes via email or through the Service. Your continued use after
            changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about this Privacy Policy or our data practices, contact us at:
            <br /><br />
            House of Geeks<br />
            Email: privacy@houseofgeeks.com.au<br />
            Website: houseofgeeks.com.au
          </p>
        </section>
      </div>
    </div>
  );
}
