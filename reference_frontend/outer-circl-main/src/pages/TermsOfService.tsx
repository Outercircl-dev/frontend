
import React from 'react';
import { FileText, ShieldCheck, Shield, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/sections/Footer';
import Navbar from '@/components/Navbar';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* Header */}
      <Navbar isLoggedIn={false} />
      
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-brand-salmon" />
            <h1 className="text-2xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-gray-500 mt-2">Last updated: May 21, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-4">
                Welcome to Outer Circle. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-600 mb-4">
                By accessing or using Outer Circle, you agree to these Terms of Service. If you do not agree to all terms, you may not use our services.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                2. Description of Service
              </h2>
              <p className="text-gray-600 mb-4">
                Outer Circle provides a platform for users to connect with others who share similar interests and organize or participate in activities. We reserve the right to modify, suspend, or discontinue any aspect of our services at any time.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                3. User Accounts
              </h2>
              <p className="text-gray-600 mb-4">
                You must create an account to use certain features of our platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and current information and to update your information as necessary.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                4. User Content
              </h2>
              <p className="text-gray-600 mb-4">
                You retain ownership of content you post on Outer Circle. By posting content, you grant us a non-exclusive, transferable, sub-licensable, royalty-free, worldwide license to use, modify, publicly display, and distribute such content on our platform.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-brand-salmon" />
                5. Event and Activity Safety Disclaimer
              </h2>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Important Safety Notice</h3>
                <p className="text-gray-700 mb-2">
                  Outer Circle is a platform that connects individuals for activities and events, but:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-2">
                  <li><span className="font-medium">We are not responsible</span> for what happens at events or activities organized through our platform</li>
                  <li>We do not verify the identity, intentions, or claims of users</li>
                  <li>We do not guarantee the safety, quality, or appropriateness of any event or activity</li>
                  <li>We do not screen participants or organizers</li>
                </ul>
                <p className="text-gray-700 font-medium">
                  By using Outer Circle and attending events organized through our platform, you acknowledge and agree that:
                </p>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>You are solely responsible for your own safety and well-being</li>
                  <li>You will take all necessary precautions when meeting others or attending events</li>
                  <li>You will research and evaluate the safety of any activity before attending</li>
                  <li>You assume all risks associated with using our platform and attending events</li>
                  <li>You release Outer Circle from any liability for injuries, damages, losses, or harmful incidents that may occur</li>
                </ul>
              </div>
              <p className="text-gray-600 mb-4">
                We strongly recommend taking precautions such as meeting in public places, informing friends or family of your plans, arranging your own transportation, and bringing a friend to new events. Trust your instincts and leave any situation that feels uncomfortable or unsafe.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                6. Privacy and Data Protection
              </h2>
              <p className="text-gray-600 mb-4">
                Our collection and use of personal information is governed by our <Link to="/privacy-policy" className="text-brand-salmon hover:underline">Privacy Policy</Link>, which is incorporated into these Terms of Service.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg my-4 border border-gray-100">
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-brand-salmon" /> GDPR Compliance
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  For users in the European Union and United Kingdom, we comply with the General Data Protection Regulation (GDPR) by:
                </p>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  <li>Providing access to your personal data</li>
                  <li>Allowing you to rectify inaccurate data</li>
                  <li>Respecting your right to erasure ("right to be forgotten")</li>
                  <li>Enabling data portability</li>
                  <li>Providing mechanisms to withdraw consent</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg my-4 border border-gray-100">
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-brand-salmon" /> US State Privacy Laws Compliance
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  For US residents, we comply with various state privacy laws, including but not limited to:
                </p>
                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                  <li><span className="font-medium">California (CCPA/CPRA)</span> - Right to know, delete, opt-out of sale/sharing, correct inaccurate information, and limit use of sensitive data</li>
                  <li><span className="font-medium">Virginia (VCDPA)</span> - Rights to access, correction, deletion, data portability, and opt-out</li>
                  <li><span className="font-medium">Colorado (CPA)</span> - Rights to access, correction, deletion, data portability, and opt-out</li>
                  <li><span className="font-medium">Connecticut (CTDPA)</span> - Rights to access, correction, deletion, data portability, and opt-out</li>
                  <li><span className="font-medium">Utah (UCPA)</span> - Rights to access, deletion, data portability, and opt-out</li>
                  <li><span className="font-medium">Oregon (ORPA)</span> - Rights to knowledge, access, correction, deletion, portability, and opt-out</li>
                  <li><span className="font-medium">Texas (TDPA)</span> - Rights to access, deletion, correction, and opt-out</li>
                </ul>
                <p className="text-gray-600 text-sm mt-2">
                  <Link to="/privacy-policy#us-privacy-laws" className="text-brand-salmon hover:underline flex items-center">
                    <span>View detailed state-specific rights in our Privacy Policy</span>
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Link>
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg my-4 border border-gray-100">
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-brand-salmon" /> HIPAA Compliance
                </h3>
                <p className="text-gray-600 text-sm">
                  While Outer Circle is not generally a covered entity under the Health Insurance Portability and Accountability Act (HIPAA), we take the protection of health-related information seriously. Any health-related information you may share on our platform is protected according to our Privacy Policy and applicable laws.
                </p>
              </div>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                7. Children's Privacy (COPPA)
              </h2>
              <p className="text-gray-600 mb-4">
                In compliance with the Children's Online Privacy Protection Act (COPPA), our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete such information. If you believe we might have any information from a child under 13, please contact us immediately.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                8. Prohibited Activities
              </h2>
              <p className="text-gray-600 mb-4">
                You agree not to engage in any of the following prohibited activities:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Violating any laws or regulations</li>
                <li>Infringing on the rights of others</li>
                <li>Posting content that is harmful, threatening, abusive, or harassing</li>
                <li>Attempting to interfere with the proper functioning of our platform</li>
                <li>Creating multiple accounts for deceptive or fraudulent purposes</li>
                <li>Collecting or harvesting personal information of other users</li>
                <li>Posting content that contains protected health information without proper authorization</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                9. Data Retention and Deletion
              </h2>
              <p className="text-gray-600 mb-4">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in our Privacy Policy. You may request deletion of your account and personal information at any time through your account settings or by contacting us directly. We will process such requests in accordance with applicable laws including GDPR, CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA, ORPA, TDPA and HIPAA where applicable.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                10. International Data Transfers
              </h2>
              <p className="text-gray-600 mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We have implemented appropriate safeguards to ensure your data remains protected wherever it is processed, in compliance with GDPR and other applicable regulations.
              </p>
              
              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                11. Your Choices and Controls
              </h2>
              <p className="text-gray-600 mb-4">
                We provide you with various controls over your information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li><strong>Account Information</strong> - You can update, correct, or delete certain personal information through your account settings.</li>
                <li><strong>Communications Preferences</strong> - You can opt out of receiving promotional emails by following the instructions in those emails or through your account settings.</li>
                <li><strong>Cookie Controls</strong> - You can modify your browser settings to reject or delete cookies, though this may impact functionality.</li>
                <li><strong>Privacy Rights</strong> - Depending on your location, you may have additional rights to access, delete, correct, or restrict the use of your personal information as described in our Privacy Policy.</li>
                <li><strong>Deleting Your Account</strong> - You may delete your account at any time by accessing the account settings page or contacting us directly.</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                12. Limitation of Liability
              </h2>
              <p className="text-gray-600 mb-4">
                To the maximum extent permitted by law, Outer Circle and its affiliates, officers, employees, agents, partners, and licensors shall not be liable for:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Any loss of profits, revenue, data, goodwill, or other intangible losses</li>
                <li>Any damages related to your access to or use of (or inability to access or use) our services</li>
                <li>Any damages related to any conduct or content of any third party on our platform</li>
                <li>Any damages related to events, activities, or interactions occurring through our platform</li>
                <li>Personal injury, property damage, or emotional distress resulting from your use of our services</li>
                <li>Any communication, conduct, or events that occur offline between users who met through our platform</li>
              </ul>
              <p className="text-gray-600 mb-4 font-medium">
                By using Outer Circle, you expressly agree that you participate in any event or activity at your own risk. The company does not guarantee the conduct of any users and disclaims all liability in this regard to the maximum extent permitted by law.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                13. Indemnification
              </h2>
              <p className="text-gray-600 mb-4">
                You agree to indemnify, defend, and hold harmless Outer Circle and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) that arise from or relate to:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-600">
                <li>Your use of or access to our services</li>
                <li>Your violation of these Terms of Service</li>
                <li>Your violation of any rights of another person or entity</li>
                <li>Your participation in any events or activities organized through our platform</li>
                <li>Your organization of events or activities through our platform</li>
                <li>Any harm or disputes that may arise between you and other users</li>
              </ul>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                14. Termination
              </h2>
              <p className="text-gray-600 mb-4">
                We reserve the right to suspend or terminate your access to our services at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
              </p>
              <p className="text-gray-600 mb-4">
                <span className="font-medium">No Refunds:</span> If your account is suspended or terminated, you will not be entitled to any refund or prorated refund for any unused portion of paid services, memberships, or subscriptions. All fees paid are non-refundable, even if services are suspended, terminated, or cancelled before the end of a subscription term.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                15. Changes to Terms
              </h2>
              <p className="text-gray-600 mb-4">
                We may modify these Terms of Service at any time. We will notify you of material changes by posting the new Terms on our platform or as required by applicable law. Your continued use of our services after such modifications constitutes your acceptance of the modified Terms.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                16. Data Processing and Privacy Shield
              </h2>
              <p className="text-gray-600 mb-4">
                Where we process personal information as a processor or service provider on behalf of our business customers, we process that information solely for the purpose of providing our services in accordance with our contractual obligations and to comply with applicable law.
              </p>
              <p className="text-gray-600 mb-4">
                For data transfers from the EEA, UK, or Switzerland to the US, we rely on appropriate data transfer mechanisms such as Standard Contractual Clauses (SCCs) or other valid transfer mechanisms to ensure adequate protection of your personal information.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                17. Accessibility
              </h2>
              <p className="text-gray-600 mb-4">
                We are committed to ensuring our website is accessible to individuals with disabilities and complies with the Web Content Accessibility Guidelines (WCAG) and applicable regulations. If you encounter any accessibility issues, please contact us so we can address them.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                18. Governing Law
              </h2>
              <p className="text-gray-600 mb-4">
                These Terms shall be governed by the laws of the state of California, without regard to its conflict of law provisions. This does not affect your statutory rights under applicable laws in your jurisdiction, including rights under GDPR, CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA, ORPA, TDPA, COPPA, or HIPAA.
              </p>

              <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-salmon" />
                19. Contact
              </h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about these Terms, data protection practices, or to exercise your rights under GDPR, CCPA/CPRA, VCDPA, CPA, CTDPA, UCPA, ORPA, TDPA, COPPA, or other applicable regulations, please <Link to="/contact-us" className="text-brand-salmon hover:underline">contact us</Link>.
              </p>
            </div>
          </div>

          <div className="text-center mt-8 mb-16">
            <p className="text-gray-500">
              By using Outer Circle, you acknowledge that you have read and understand these Terms of Service.
            </p>
            <div className="mt-4">
              <Link to="/privacy-policy" className="text-brand-salmon hover:underline text-sm flex items-center justify-center">
                <span>View our Privacy Policy</span>
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
