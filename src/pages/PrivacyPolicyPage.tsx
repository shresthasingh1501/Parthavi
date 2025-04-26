// src/pages/PrivacyPolicyPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    const navigate = useNavigate();

    // --- Dummy Content ---
    const sections = [
        { title: "Introduction", content: "Welcome to Parthavi's Privacy Policy. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this policy, or our practices with regards to your personal information, please contact us." },
        { title: "Information We Collect", content: "We collect personal information that you voluntarily provide to us when you register on the App, express an interest in obtaining information about us or our products and services, when you participate in activities on the App (such as posting messages in our chat features) or otherwise when you contact us. The personal information that we collect depends on the context of your interactions with us and the App, the choices you make and the products and features you use. The personal information we collect may include the following: Name, Email Address, Professional Information (like job title, industry - if provided), Chat History." },
        { title: "How We Use Your Information", content: "We use personal information collected via our App for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We use the information we collect or receive: To facilitate account creation and logon process; To manage user accounts; To send administrative information to you; To protect our Services; To respond to user inquiries/offer support to users; To improve our AI models (using anonymized and aggregated data where possible)." },
        { title: "Will Your Information Be Shared?", content: "We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We do not sell your personal information." },
        { title: "How Long Do We Keep Your Information?", content: "We keep your information for as long as necessary to fulfill the purposes outlined in this privacy policy unless otherwise required by law." },
        { title: "Your Privacy Rights", content: "Depending on your location, you may have rights regarding your personal information, such as the right to access, correct, or delete your data. Please contact us to exercise these rights." },
        { title: "Updates To This Policy", content: "We may update this privacy policy from time to time. The updated version will be indicated by an updated 'Revised' date and the updated version will be effective as soon as it is accessible." },
        { title: "Contact Us", content: "If you have questions or comments about this policy, you may email us at shresthasinghrrsc@gmail.com." }
    ];
    // --- End Dummy Content ---

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                <div className="flex items-center mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 mr-3" aria-label="Back">
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Privacy Policy</h1>
                </div>

                <div className="flex-1 max-w-3xl mx-auto w-full prose prose-sm md:prose-base prose-headings:font-serif prose-headings:text-secondary prose-p:text-secondary/80 prose-p:leading-relaxed">
                    <p className="text-xs text-gray-500 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
                    {sections.map(section => (
                        <div key={section.title} className="mb-6">
                            <h2 className="text-lg font-semibold mb-2">{section.title}</h2>
                            <p>{section.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </PageTransition>
    );
};

export default PrivacyPolicyPage;
