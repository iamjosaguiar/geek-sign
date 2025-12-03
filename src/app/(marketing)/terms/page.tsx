import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Geek Sign",
  description: "Terms of Service for Geek Sign electronic signature platform",
};

export default function TermsPage() {
  return (
    <div className="container max-w-4xl py-16">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: December 2, 2024</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using Geek Sign (&ldquo;the Service&rdquo;), operated by House of Geeks
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            Geek Sign provides an electronic signature platform that allows users to send, sign,
            and manage documents electronically. The Service is designed to comply with the
            Electronic Signatures in Global and National Commerce Act (ESIGN Act) and the
            Uniform Electronic Transactions Act (UETA).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Electronic Signatures</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              By using our Service to sign documents electronically, you acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your electronic signature is legally binding and has the same legal effect as a handwritten signature.</li>
              <li>You consent to conduct business electronically and to receive documents and notices electronically.</li>
              <li>You have the capability to access, view, and retain electronic records.</li>
              <li>You intend to sign the document(s) presented to you.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. User Accounts</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete registration information.</li>
              <li>Maintain the security of your account credentials.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
              <li>Accept responsibility for all activities under your account.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload or transmit documents containing illegal, fraudulent, or harmful content.</li>
              <li>Impersonate any person or entity.</li>
              <li>Violate any applicable laws or regulations.</li>
              <li>Interfere with or disrupt the Service or servers.</li>
              <li>Attempt to gain unauthorized access to any part of the Service.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Document Storage and Retention</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              We store documents and signature records securely. Our retention policy includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Documents are retained for a minimum of 7 years after signing.</li>
              <li>Audit logs and signature records are maintained indefinitely.</li>
              <li>Users may download copies of their documents at any time.</li>
              <li>Upon account deletion, documents may be retained for legal compliance purposes.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Service and its original content, features, and functionality are owned by
            House of Geeks and are protected by international copyright, trademark, and other
            intellectual property laws. Your documents remain your property; we claim no
            ownership over content you upload.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground leading-relaxed">
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND.
            WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY
            SECURE. WE ARE NOT RESPONSIBLE FOR THE LEGAL ENFORCEABILITY OF ANY DOCUMENT SIGNED
            USING OUR SERVICE. USERS SHOULD CONSULT WITH LEGAL COUNSEL REGARDING THE LEGAL
            REQUIREMENTS FOR THEIR SPECIFIC USE CASES.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOUSE OF GEEKS SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR
            USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR
            THE SERVICE IN THE TWELVE MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree to indemnify and hold harmless House of Geeks and its affiliates from any
            claims, damages, or expenses arising from your use of the Service or violation of
            these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may terminate or suspend your account at any time for violation of these Terms.
            You may terminate your account at any time by contacting us. Upon termination, your
            right to use the Service will cease immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of
            Australia, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify users of
            material changes via email or through the Service. Continued use of the Service
            after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, please contact us at:
            <br /><br />
            House of Geeks<br />
            Email: legal@houseofgeeks.com.au<br />
            Website: houseofgeeks.com.au
          </p>
        </section>
      </div>
    </div>
  );
}
