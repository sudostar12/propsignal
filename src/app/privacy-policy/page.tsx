// src/app/privacy-policy/page.tsx
// Privacy Policy page for PropSignal (Australia-only)

import React from "react";
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"

// -- Optional SEO (Next.js App Router) --
export const metadata = {
  title: "Privacy Policy – PropSignal",
  description:
    "PropSignal Privacy Policy for our Australian residential real-estate insights platform.",
};

export default function PrivacyPolicyPage() {
  // -- SERVER-SIDE NOTE --


  return (
    <div className="min-h-screen bg-transparent">
      <Header />
    <main
  className="
    prose prose-slate prose-lg 
    max-w-3xl mx-auto px-4 py-8 
    bg-transparent 
    prose-headings:text-gray-900 
    prose-p:text-gray-700 
    prose-strong:text-gray-800 
    prose-a:text-blue-600 hover:prose-a:underline
  "
>

      <h1>Privacy Policy</h1>
      
      <h2>1. About PropSignal</h2>
      <p>
        PropSignal (“we”, “us”, or “our”) operates an online platform providing
        data-driven property insights and AI-assisted analysis for the Australian
        residential real-estate market (“Services”). We are committed to
        protecting your privacy and handling personal information in accordance
        with the <em>Privacy Act 1988 (Cth)</em> and the Australian Privacy
        Principles (APPs).
      </p>
      <p>
        By using our website or Services, you agree to the terms set out in this
        Privacy Policy.
      </p>

      <h2>2. Scope of this Policy</h2>
      <p>
        This Privacy Policy explains how PropSignal collects, uses, and manages
        personal information obtained through our website and online Services.
        PropSignal’s Services are intended for use within Australia. 
        Users accessing the site from outside Australia acknowledge that all data processing and insights are based solely on Australian real-estate information.
      </p>

      <h2>3. What Information We Collect</h2>
      <p>
        We collect only limited personal information necessary to operate our
        Services effectively. This may include information you provide directly
        via forms or inputs (e.g., name or general suburb interests) and
        technical data collected automatically for analytics and performance
        purposes (e.g., IP address, device/browser type, and usage statistics).
      </p>
      <p>
        We do not collect or store sensitive information (such
        as financial details, identity documents, health information, or other
        protected categories).
      </p>
      <p>
        We also use Australian real-estate market data that is{" "}
        publicly available under free-use or open data licences{" "}
        to support analysis and insights.
      </p>

      <h2>4. Important Notice About User Inputs (AI Chat)</h2>
      <p>
        Our platform includes an AI-based chat function designed to generate
        property insights, research summaries, and data-driven commentary.
        Users must not enter any sensitive, confidential, or
        personally identifying information into any free-text fields or chat
        inputs (for example: financial details, identity numbers, precise home
        addresses, or scanned IDs). All inputs may be processed by third-party
        AI services solely to generate responses to your queries.
      </p>
      <p>
        We take reasonable measures to protect information transmitted to our
        Services; however, no method of transmission or storage is completely
        secure. You are responsible for the information you submit, and we
        recommend avoiding entry of any information you would not wish to be
        processed by third-party AI tools.
      </p>

      <h2>5. How We Use Information</h2>
      <ul>
        <li>Operate, maintain, and improve the website and AI-based Services;</li>
        <li>Generate suburb-level and property-related insights;</li>
        <li>Respond to user feedback submitted through our website;</li>
        <li>Analyse usage trends to improve user experience;</li>
        <li>Comply with applicable Australian privacy laws and regulations.</li>
      </ul>
      <p>
        We do not sell or rent personal information to third
        parties. Any third-party services we use (for example, analytics or AI
        APIs) are subject to their own privacy and security obligations.
      </p>

      <h2>6. Data Sources and Attribution</h2>
      <p>
        All property and suburb data presented on PropSignal is derived from{" "}
        publicly available Australian datasets and other open
        data sources provided under free-use or open-access licences.
        We do not claim ownership of such data and acknowledge the rights of
        respective data custodians where applicable.
      </p>

      <h2>7. Disclaimer and Limitation of Liability</h2>
      <p>
        The insights, outputs, and AI-generated content provided by PropSignal
        are for informational and research purposes only. They
        do not constitute professional, financial, legal, or
        investment advice. You should conduct your own due diligence and seek
        professional advice before making property-related decisions.
      </p>
      <p>
        While we endeavour to ensure accuracy, completeness, and timeliness,
        PropSignal does not guarantee the accuracy, reliability,
        or currency of any data or AI-generated output. To the maximum extent
        permitted by law, PropSignal and its affiliates disclaim all liability
        for any loss, damage, cost, or expense (including without limitation
        direct, indirect, incidental, special, or consequential loss) arising
        from or in connection with your use of, or reliance on, our website,
        Services, or any information or insights generated on the platform.
        Your use of PropSignal is at your own risk.
      </p>

      <h2>8. Cookies and Analytics</h2>
      <p>
        We may use cookies and analytics tools to measure website usage, track
        performance, and improve service quality. You can disable cookies in
        your browser settings, but some features may not function properly.
      </p>

      <h2>9. Data Storage and Retention</h2>
      <p>
        Information collected is stored using reputable cloud infrastructure and
        appropriate technical and organisational safeguards. We retain
        non-personal usage data only as long as necessary for analytics and
        service optimisation. Chat inputs may be temporarily processed or cached
        for response generation but are not retained longer than necessary for
        those operational purposes.
      </p>

      <h2>10. Links to Third-Party Sites</h2>
      <p>
        Our website may contain links to third-party sites or services. We are
        not responsible for the privacy practices, content, or security of
        external sites. We recommend reviewing the privacy policies of those
        third parties.
      </p>

      <h2>11. How to Contact PropSignal</h2>
      <p>
        If you wish to contact us regarding privacy or other matters,
        please use the <strong>Submit Feedback</strong> form located at the top of this page.
      </p>

<h2>12. Related Policies and Terms</h2>
<p>
  Your use of this website is also subject to our{" "}
  <a href="/terms" className="text-blue-600 hover:underline">
    Terms &amp; Conditions
  </a>
  , which outline the rules for using the PropSignal platform, permitted uses of
  AI-generated insights, intellectual property rights, and limitations of
  liability. We encourage you to review both documents together to understand
  how PropSignal collects information and the terms under which our Services are
  provided.
</p>


      <h2>13. Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy periodically to reflect operational or
        legal changes. Your continued use
        of the website constitutes acceptance of any updated terms.
      </p>
          
      <h2>14. Governing Law</h2>
      <p>
        This Privacy Policy is governed by the laws of the Commonwealth of
        Australia and relevant State and Territory privacy legislation.
      </p>
    </main>
    <Footer />
      </div>
  );
}

