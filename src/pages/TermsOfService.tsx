import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Terms of Service - PendragonX"
        description="Read the PendragonX Terms of Service. Understand your rights and responsibilities when using our AI-powered knowledge management platform."
        canonicalUrl="https://pendragonx.com/terms"
        noIndex={false}
      />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: December 16, 2024</p>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using PendragonX (the "Service"), operated by Mills Tech Industry ("Company," "we," "us," or "our"), you ("User," "you," or "your") acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. MILLS TECH INDUSTRY EXPRESSLY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL MILLS TECH INDUSTRY, ITS AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, LICENSORS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Loss of data, information, or content</li>
              <li>Loss of profits, revenue, or business opportunities</li>
              <li>Loss of use or functionality</li>
              <li>Damages arising from unauthorized access to or alteration of your transmissions or data</li>
              <li>Damages arising from any bugs, viruses, trojan horses, or similar harmful code</li>
              <li>Damages arising from the conduct or content of any third party on the Service</li>
              <li>Any other damages arising out of or related to your use or inability to use the Service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              THIS LIMITATION APPLIES REGARDLESS OF THE THEORY OF LIABILITY (WHETHER BASED ON WARRANTY, CONTRACT, STATUTE, TORT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER LEGAL THEORY) AND EVEN IF MILLS TECH INDUSTRY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Loss and System Failures</h2>
            <p className="text-muted-foreground leading-relaxed">
              You acknowledge and agree that Mills Tech Industry shall not be held liable for any loss, corruption, or destruction of data, notes, documents, or any other information stored on or through the Service. You are solely responsible for maintaining backup copies of any data you store on the Service. We strongly recommend that you regularly export and backup your data to external storage systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Conduct and Misuse</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mills Tech Industry is not responsible for any misuse of the Service by you or any third party. You agree to use the Service only for lawful purposes and in accordance with these Terms. You are solely responsible for all activities that occur under your account and for the content you create, upload, or share through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless Mills Tech Industry and its affiliates, officers, directors, employees, agents, licensors, and suppliers from and against any and all claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-primary">7. Binding Arbitration and Class Action Waiver</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You and Mills Tech Industry agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Service (collectively, "Disputes") will be resolved exclusively through final and binding arbitration, rather than in court.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Waiver of Right to Sue:</strong> BY AGREEING TO THESE TERMS, YOU EXPRESSLY WAIVE YOUR RIGHT TO BRING ANY CLAIMS AGAINST MILLS TECH INDUSTRY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, PARTNERS, LICENSORS, OR SUPPLIERS IN ANY COURT OF LAW. You agree that any Disputes shall be resolved solely through binding arbitration as set forth herein.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Class Action Waiver:</strong> YOU AND MILLS TECH INDUSTRY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION. Unless both you and Mills Tech Industry agree otherwise, the arbitrator may not consolidate more than one person's claims and may not otherwise preside over any form of representative or class proceeding.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Arbitration Procedures:</strong> The arbitration will be administered by the American Arbitration Association ("AAA") in accordance with its Consumer Arbitration Rules. The arbitration will be conducted in the English language. The arbitrator's decision shall be final and binding, and judgment on the award rendered by the arbitrator may be entered in any court having jurisdiction thereof.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Exceptions:</strong> Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mills Tech Industry reserves the right to modify these Terms at any time in its sole discretion. We will provide notice of material changes by posting the updated Terms on the Service with a new "Last Updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is held to be invalid, illegal, or unenforceable, such provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable, and the remaining provisions shall continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Mills Tech Industry regarding your use of the Service and supersede all prior agreements, understandings, and communications, whether written or oral.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact Mills Tech Industry at the contact information provided on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
