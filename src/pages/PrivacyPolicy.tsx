import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead, ogImages } from "@/components/SEOHead";
import { SEOBreadcrumb } from "@/components/SEOBreadcrumb";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Privacy Policy - Baku Scribe"
        description="Learn how Baku Scribe protects your privacy. We never sell, trade, or rent your personal information. Your data belongs to you."
        canonicalUrl="https://pendragonx.com/privacy"
        ogImage={ogImages.privacy}
        noIndex={false}
      />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <SEOBreadcrumb 
          items={[{ label: "Privacy Policy" }]} 
          className="mb-6"
        />
        
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: December 16, 2024</p>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Halcyon Systems Group ("Company," "we," "us," or "our") operates Baku Scribe (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. By using the Service, you consent to the data practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">2. We Do Not Sell, Buy, or Trade Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Halcyon Systems Group does not sell, buy, trade, rent, or otherwise transfer your personal information to third parties for commercial purposes.</strong> Your data is your data. We are committed to protecting your privacy and will never monetize your personal information by selling it to advertisers, data brokers, or any other third parties.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We will never:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Sell your personal information to third parties</li>
              <li>Buy personal information about you from third parties</li>
              <li>Trade your information with other companies</li>
              <li>Share your information with advertisers for targeted advertising</li>
              <li>Use your content to train AI models for third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may collect the following types of information:
            </p>
            <h3 className="text-xl font-medium mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Email address (for account creation and communication)</li>
              <li>Display name (optional, for personalization)</li>
              <li>Profile information you choose to provide</li>
            </ul>
            <h3 className="text-xl font-medium mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Device information (browser type, operating system)</li>
              <li>Log data (IP address, access times, pages viewed)</li>
              <li>Feature usage patterns to improve our Service</li>
            </ul>
            <h3 className="text-xl font-medium mt-4 mb-2">User Content</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Notes, cards, documents, and other content you create</li>
              <li>Files you upload to the Service</li>
              <li>This content is stored securely and is never shared with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect solely for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>To provide, maintain, and improve the Service</li>
              <li>To create and manage your account</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To send you important notices about the Service</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Optional end-to-end encryption for sensitive content</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure data storage infrastructure</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you with the Service. You may request deletion of your account and associated data at any time. Upon account deletion, we will delete or anonymize your personal information within a reasonable timeframe, except where we are required to retain certain information for legal or legitimate business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites or services that are not owned or controlled by Halcyon Systems Group. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites or services. We encourage you to review the privacy policies of any third-party services you access.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We may use third-party service providers to help us operate our Service (such as hosting providers and payment processors). These providers are bound by contractual obligations to keep personal information confidential and use it only for the purposes for which we disclose it to them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. Cookies are files with a small amount of data that are stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without verification of parental consent, we will take steps to remove that information from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>The right to access the personal information we hold about you</li>
              <li>The right to request correction of inaccurate personal information</li>
              <li>The right to request deletion of your personal information</li>
              <li>The right to object to processing of your personal information</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, please contact us using the contact information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. By using our Service, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact Halcyon Systems Group at the contact information provided on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
