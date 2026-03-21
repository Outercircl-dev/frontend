
import React from 'react';
import { Shield, MessageSquare, Users, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '../components/sections/Footer';

const CommunityGuidelines = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-brand-salmon" />
            <h1 className="text-2xl font-bold">Community Guidelines</h1>
          </div>
          <p className="text-gray-500 mt-2">Last updated: May 2, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 pinterest-card">
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-6 text-lg">
                Welcome to the outercircl community! These guidelines are designed to foster a positive, respectful, 
                and inclusive environment where everyone feels welcome to share interests and connect with others.
              </p>
              
              <div className="bg-pink-50 p-5 rounded-lg border border-pink-100 flex gap-4">
                <div className="shrink-0 mt-1">
                  <Info className="h-5 w-5 text-brand-salmon" />
                </div>
                <p className="text-gray-700 text-sm m-0">
                  By using outercircl, you agree to follow these community guidelines along with our 
                  <Link to="/terms-of-service" className="text-brand-salmon hover:underline mx-1">Terms of Service</Link>
                  and
                  <Link to="/privacy-policy" className="text-brand-salmon hover:underline mx-1">Privacy Policy</Link>.
                  Failure to comply may result in content removal, account restrictions, or termination.
                </p>
              </div>
            </div>
          </div>

          {/* Core Guidelines Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 pinterest-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-full">
                  <MessageSquare className="h-5 w-5 text-brand-purple" />
                </div>
                <h2 className="text-xl font-semibold">Be Respectful</h2>
              </div>
              <p className="text-gray-600">
                Treat others with kindness and respect. We don't tolerate harassment, hate speech, discrimination, 
                or bullying based on race, ethnicity, national origin, sex, gender, gender identity, sexual orientation, 
                religion, age, disability, or health condition.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 pinterest-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Shield className="h-5 w-5 text-brand-purple" />
                </div>
                <h2 className="text-xl font-semibold">Stay Safe</h2>
              </div>
              <p className="text-gray-600">
                Protect your personal information and be cautious when sharing details with others. 
                Don't share others' personal information without consent, and report any concerning 
                behavior to our team immediately.
              </p>
            </div>
          </div>

          {/* Detailed Guidelines */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 pinterest-card">
            <h2 className="text-2xl font-semibold mb-6 border-b pb-3">Detailed Community Guidelines</h2>
            
            <h3 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
              <div className="bg-salmon-100 p-1 rounded-full">
                <Shield className="h-4 w-4 text-brand-salmon" />
              </div>
              1. Content Standards
            </h3>
            <ul className="list-disc pl-8 text-gray-600 space-y-2 mb-6">
              <li><span className="font-medium">Accuracy:</span> Share truthful information and clearly distinguish facts from opinions.</li>
              <li><span className="font-medium">Originality:</span> Respect copyright and intellectual property rights. Give credit to original creators when sharing content.</li>
              <li><span className="font-medium">No harmful content:</span> Don't post content that promotes violence, self-harm, dangerous activities, or illegal substances.</li>
              <li><span className="font-medium">Appropriate content:</span> Keep content suitable for a diverse audience. Mark sensitive content appropriately.</li>
            </ul>
            
            <h3 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
              <div className="bg-salmon-100 p-1 rounded-full">
                <Users className="h-4 w-4 text-brand-salmon" />
              </div>
              2. Activity Hosting & Participation
            </h3>
            <ul className="list-disc pl-8 text-gray-600 space-y-2 mb-6">
              <li><span className="font-medium">Reliability:</span> Show up to activities you've committed to attend. Cancel with reasonable notice if necessary.</li>
              <li><span className="font-medium">Inclusivity:</span> Make activities welcoming to all participants and be clear about any requirements or restrictions.</li>
              <li><span className="font-medium">Safety:</span> Choose public, safe locations for initial meetings. Follow safety best practices.</li>
              <li><span className="font-medium">Transparency:</span> Be honest about activity details, including costs, expectations, and any potential risks.</li>
            </ul>
            
            <h3 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
              <div className="bg-salmon-100 p-1 rounded-full">
                <MessageSquare className="h-4 w-4 text-brand-salmon" />
              </div>
              3. Communication
            </h3>
            <ul className="list-disc pl-8 text-gray-600 space-y-2 mb-6">
              <li><span className="font-medium">Respectful dialogue:</span> Engage in constructive conversations, even when disagreeing.</li>
              <li><span className="font-medium">No spam:</span> Don't send excessive messages, promotional content, or unsolicited advertisements.</li>
              <li><span className="font-medium">Private conversations:</span> Respect boundaries in private messages and honor requests to end conversations.</li>
              <li><span className="font-medium">Report concerns:</span> If someone makes you uncomfortable, use our reporting tools.</li>
            </ul>
            
            <h3 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
              <div className="bg-salmon-100 p-1 rounded-full">
                <Shield className="h-4 w-4 text-brand-salmon" />
              </div>
              4. Account Usage
            </h3>
            <ul className="list-disc pl-8 text-gray-600 space-y-2 mb-6">
              <li><span className="font-medium">Authentic identity:</span> Use your real identity and don't create multiple accounts.</li>
              <li><span className="font-medium">Account security:</span> Use strong passwords and don't share your account credentials.</li>
              <li><span className="font-medium">No impersonation:</span> Don't pretend to be someone else or create accounts on behalf of others without permission.</li>
            </ul>
          </div>
          
          {/* Enforcement Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 pinterest-card">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-3">Guideline Enforcement</h2>
            
            <p className="text-gray-600 mb-4">
              We take these guidelines seriously and enforce them to maintain a positive community experience. 
              Violations may result in one or more of the following actions:
            </p>
            
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Content Removal</h3>
                <p className="text-gray-600 text-sm">Content that violates our guidelines will be removed without notice.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Warnings</h3>
                <p className="text-gray-600 text-sm">For minor violations, we may issue a warning and provide education about our guidelines.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Temporary Restrictions</h3>
                <p className="text-gray-600 text-sm">We may temporarily limit account features or suspend accounts for serious or repeated violations.</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Account Termination</h3>
                <p className="text-gray-600 text-sm">For severe or persistent violations, we may permanently terminate accounts without refund of any paid services.</p>
              </div>
            </div>
            
            <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
              <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2 text-brand-purple" /> Reporting Violations
              </h3>
              <p className="text-gray-700 text-sm">
                If you encounter content or behavior that violates these guidelines, please report it immediately. 
                We review all reports and take appropriate action to maintain community standards.
              </p>
              <div className="mt-3">
                <Link to="/contact-us" className="text-sm font-medium text-brand-purple hover:underline">
                  Contact our Support Team →
                </Link>
              </div>
            </div>
          </div>
          
          {/* Updates Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-16 pinterest-card">
            <h2 className="text-xl font-semibold mb-4">Updates to Guidelines</h2>
            <p className="text-gray-600 mb-4">
              These guidelines may be updated periodically. We'll notify you about significant changes 
              through our platform or via email. Your continued use of outercircl after changes 
              indicates your acceptance of the updated guidelines.
            </p>
            <p className="text-gray-600">
              If you have questions or feedback about our Community Guidelines, please 
              <Link to="/contact-us" className="text-brand-salmon hover:underline mx-1">contact us</Link>.
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default CommunityGuidelines;
