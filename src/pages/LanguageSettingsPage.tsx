// src/pages/LanguageSettingsPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive'; // Import useMediaQuery


// Wider range of languages including scripts for visual distinction
const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिन्दी' }, // Hindi
    { code: 'bn', name: 'বাংলা' }, // Bengali
    { code: 'te', name: 'తెలుగు' }, // Telugu
    { code: 'mr', name: 'मराठी' }, // Marathi
    { code: 'ta', name: 'தமிழ்' }, // Tamil
    { code: 'gu', name: 'ગુજરાતી' }, // Gujarati
    { code: 'kn', name: 'ಕನ್ನಡ' }, // Kannada
    { code: 'ml', name: 'മലയാളം' }, // Malayalam
    { code: 'pa', name: 'ਪੰਜਾਬੀ' }, // Punjabi
];

const LanguageSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' }); // Detect mobile screen
    const [selectedLanguageCode, setSelectedLanguageCode] = useState('en');
    const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for horizontal scroll on desktop

    // Function to scroll the selected item into the center (optional enhancement)
    useEffect(() => {
        // Only attempt scrolling on desktop
        if (!isMobile) {
             const selectedElement = scrollContainerRef.current?.querySelector(`[data-lang-code="${selectedLanguageCode}"]`);
            if (selectedElement && scrollContainerRef.current) {
                 const containerWidth = scrollContainerRef.current.offsetWidth;
                 const elementLeft = (selectedElement as HTMLElement).offsetLeft;
                 const elementWidth = (selectedElement as HTMLElement).offsetWidth;
                 const scrollLeft = elementLeft - (containerWidth / 2) + (elementWidth / 2);

                scrollContainerRef.current.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedLanguageCode, isMobile]); // Run when selection changes or mobile state changes

    const selectedLanguageName = LANGUAGES.find(l => l.code === selectedLanguageCode)?.name || 'English';

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                {/* Header */}
                 <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 mr-3"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Language settings</h1>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center pt-16"> {/* Added padding-top */}
                     <p className="text-secondary/80 text-base mb-10 px-1 text-center max-w-md">
                        Select your preferred language for Parthavi.
                     </p>

                    {/* Conditional Language Selector Layout */}
                    {isMobile ? (
                        // Mobile: Vertical List Layout
                        <div className="w-full max-w-xs mx-auto space-y-4">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setSelectedLanguageCode(lang.code)}
                                    className={clsx(
                                        "w-full px-6 py-3 rounded-full text-base font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                                        selectedLanguageCode === lang.code
                                            ? 'bg-primary text-white shadow-md'
                                            : 'bg-gray-100 text-secondary hover:bg-gray-200/80'
                                    )}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Desktop: Horizontal Scroll Layout
                        <div className="w-full max-w-xl mx-auto">
                            <div
                               ref={scrollContainerRef}
                               className="flex space-x-3 overflow-x-auto pb-4 px-[calc(50%-40px)] /* Padding L/R to allow edge items to center */
                                          whitespace-nowrap scrollbar-hide snap-x snap-mandatory"
                            >
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        data-lang-code={lang.code} // Add data attribute for scrolling effect
                                        onClick={() => setSelectedLanguageCode(lang.code)}
                                        // Snap alignment for each button
                                        className={clsx(
                                            "snap-center flex-shrink-0 px-6 py-3 rounded-full text-base font-medium transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                                            selectedLanguageCode === lang.code
                                                ? 'bg-primary text-white shadow-md scale-105' // Enhanced selected style
                                                : 'bg-gray-100 text-secondary hover:bg-gray-200/80 scale-95 opacity-70 hover:opacity-100' // Deselected style
                                        )}
                                        style={{ minWidth: '80px' }} // Ensure minimum width for snapping
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}


                    <p className="text-sm text-gray-500 mt-12 px-1 text-center">
                        Currently selected: <span className="font-semibold">{selectedLanguageName}</span>
                    </p>
                    {/* Add save button or auto-save logic if needed */}
                </div>
            </div>
        </PageTransition>
    );
};

export default LanguageSettingsPage;
