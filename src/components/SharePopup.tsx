// src/components/SharePopup.tsx
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface SharePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

const SharePopup: React.FC<SharePopupProps> = ({ isOpen, onClose }) => {
    const shareUrl = window.location.origin; // Share the base URL of the app
    const shareMessage = "Check out Parthavi - AI career guidance for Indian women!";

    const handleShare = (platform: 'whatsapp' | 'twitter' | 'linkedin') => {
        let url = '';
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedMessage = encodeURIComponent(shareMessage + " " + shareUrl); // Message includes URL

        switch (platform) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodedMessage}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
                break;
            case 'linkedin':
                 // LinkedIn requires URL param specifically
                 url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
        }

        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
        onClose(); // Close popup after attempting share
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out transition-opacity duration-300 z-40" /> {/* Added z-index */}
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-[90vw] max-w-md data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out transition-opacity duration-300 z-50"> {/* Added z-index */}
                    <Dialog.Title className="text-lg font-semibold font-serif text-secondary mb-2">
                        Share Parthavi
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-secondary/70 mb-5">
                        Help others discover Parthavi for their career journey!
                    </Dialog.Description>

                    <div className="space-y-3">
                        <button
                            onClick={() => handleShare('whatsapp')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            {/* Add Icon if available, e.g., <WhatsAppIcon /> */}
                            Share on WhatsApp
                        </button>
                         <button
                            onClick={() => handleShare('twitter')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                             {/* <TwitterIcon /> */}
                            Share on X (Twitter)
                        </button>
                         <button
                            onClick={() => handleShare('linkedin')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                             {/* <LinkedInIcon /> */}
                            Share on LinkedIn
                        </button>
                    </div>

                    <Dialog.Close asChild>
                        <button
                            className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-gray-100"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default SharePopup;
