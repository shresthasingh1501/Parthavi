// src/pages/TermsOfServicePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { ArrowLeft } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
    const navigate = useNavigate();

     // --- Dummy Content ---
    const sections = [
        { title: "Agreement to Terms", content: "By accessing or using the Parthavi application ('App'), you agree to be bound by these Terms of Service ('Terms'). If you disagree with any part of the terms, then you may not access the App." },
        { title: "Use License", content: "Permission is granted to temporarily download one copy of the materials (information or software) on Parthavi's App for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose, or for any public display (commercial or non-commercial); attempt to decompile or reverse engineer any software contained on Parthavi's App; remove any copyright or other proprietary notations from the materials; or transfer the materials to another person or 'mirror' the materials on any other server. This license shall automatically terminate if you violate any of these restrictions and may be terminated by Parthavi at any time." },
        { title: "Disclaimer", content: "The materials and services on Parthavi's App are provided on an 'as is' basis. Parthavi makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights. Further, Parthavi does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its App or otherwise relating to such materials or on any sites linked to this site. AI responses may contain inaccuracies or errors; do not rely solely on the information provided for critical decisions." },
        { title: "Limitations", content: "In no event shall Parthavi or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Parthavi's App, even if Parthavi or a Parthavi authorized representative has been notified orally or in writing of the possibility of such damage." },
        { title: "Accuracy of Materials", content: "The materials appearing on Parthavi's App could include technical, typographical, or photographic errors. Parthavi does not warrant that any of the materials on its App are accurate, complete or current. Parthavi may make changes to the materials contained on its App at any time without notice. However Parthavi does not make any commitment to update the materials." },
        { title: "Links", content: "Parthavi has not reviewed all of the sites linked to its App and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Parthavi of the site. Use of any such linked website is at the user's own risk." },
        { title: "Modifications", content: "Parthavi may revise these Terms of Service for its App at any time without notice. By using this App you are agreeing to be bound by the then current version of these Terms of Service." },
        { title: "Governing Law", content: "These terms and conditions are governed by and construed in accordance with the laws of [Your Jurisdiction - e.g., India] and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location." }
    ];
    // --- End Dummy Content ---


    return (
        <PageTransition>
             <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                <div className="flex items-center mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 mr-3" aria-label="Back">
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Terms of Service</h1>
                </div>

                 <div className="flex-1 max-w-3xl mx-auto w-full prose prose-sm md:prose-base prose-headings:font-serif prose-headings:text-secondary prose-p:text-secondary/80 prose-p:leading-relaxed">
                    <p className="text-xs text-gray-500 mb-4">Effective Date: {new Date().toLocaleDateString()}</p>
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

export default TermsOfServicePage;
