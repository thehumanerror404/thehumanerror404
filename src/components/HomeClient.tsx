'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import PixelRobot from '@/components/PixelRobot';
import { Modal } from '@/components/ui/Modal';
import { getAllRoleTerms } from '@/lib/utils';

interface HomeClientProps {
    aboutContent: string;
}

export default function HomeClient({ aboutContent }: HomeClientProps) {
    const [jobTitle, setJobTitle] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const router = useRouter();

    // Get all searchable terms (canonical roles + aliases)
    const allRoleTerms = useMemo(() => getAllRoleTerms(), []);

    const filteredJobs = useMemo(() => {
        if (!jobTitle) return [];
        // Filter through all terms (canonical + aliases)
        const matches = allRoleTerms.filter(term =>
            term.toLowerCase().includes(jobTitle.toLowerCase())
        );

        // Deduplicate and limit to 10 suggestions
        const uniqueMatches = Array.from(new Set(matches));
        return uniqueMatches.slice(0, 10);
    }, [jobTitle, allRoleTerms]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Capitalize first letter
        const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
        setJobTitle(capitalized);
        setShowSuggestions(true);
    };

    const handleSuggestionClick = (role: string) => {
        setJobTitle(role);
        setShowSuggestions(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check if input matches any role term (canonical or alias)
        if (allRoleTerms.some(term => term.toLowerCase() === jobTitle.toLowerCase())) {
            // Store the input (will be resolved to canonical role on result page)
            localStorage.setItem('jobTitle', jobTitle);
            router.push('/analysis');
        } else {
            // Optional: Show error or clear input
            alert("Please select a valid job role from the list.");
        }
    };

    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setSendResult(null);

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: contactName,
                    email: contactEmail,
                    message: contactMessage,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSendResult({ success: true, message: 'Message sent successfully!' });
                setContactName('');
                setContactEmail('');
                setContactMessage('');
                // Close modal after a short delay
                setTimeout(() => {
                    setShowContact(false);
                    setSendResult(null);
                }, 2000);
            } else {
                setSendResult({ success: false, message: data.error?.message || 'Failed to send message.' });
            }
        } catch (error) {
            setSendResult({ success: false, message: 'An error occurred. Please try again.' });
        } finally {
            setIsSending(false);
        }
    };

    // Helper to render markdown content simply
    const renderAboutContent = () => {
        const parseInlineStyles = (text: string) => {
            // Split by bold (**...**) and italic (*...*) syntax
            const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="font-bold text-[var(--md-sys-color-on-surface)]">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={index} className="italic text-[var(--md-sys-color-on-surface-variant)]">{part.slice(1, -1)}</em>;
                }
                return part;
            });
        };

        return aboutContent.split('\n').map((line, i) => {
            // Headers
            if (line.startsWith('# ')) {
                return <h3 key={i} className="text-2xl md:text-3xl font-bold mb-6 mt-4 text-[var(--md-sys-color-primary)] tracking-tight">{line.replace('# ', '')}</h3>;
            }
            if (line.startsWith('## ')) {
                return <h4 key={i} className="text-xl font-bold mb-4 mt-8 text-[var(--md-sys-color-secondary)]">{line.replace('## ', '')}</h4>;
            }
            // Empty lines
            if (line.trim() === '') {
                return <div key={i} className="h-4" />;
            }
            // Lists (simple support)
            if (line.trim().startsWith('- ')) {
                return (
                    <div key={i} className="flex gap-3 mb-3 ml-1">
                        <span className="text-[var(--md-sys-color-primary)] mt-1.5">•</span>
                        <p className="leading-relaxed text-[var(--md-sys-color-on-surface-variant)]">
                            {parseInlineStyles(line.replace('- ', ''))}
                        </p>
                    </div>
                );
            }
            // Paragraphs
            return <p key={i} className="mb-2 leading-relaxed text-[var(--md-sys-color-on-surface-variant)] text-base">{parseInlineStyles(line)}</p>;
        });
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 relative overflow-hidden bg-[var(--md-sys-color-background)]">

            {/* About & Contact Buttons - Top Right */}
            <div className="absolute top-6 right-6 z-20 flex gap-3">
                <Button
                    variant="secondary"
                    onClick={() => setShowContact(true)}
                    className="text-xs px-5 py-2 font-bold tracking-widest opacity-80 hover:opacity-100"
                >
                    Contact
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => setShowAbout(true)}
                    className="text-xs px-5 py-2 font-bold tracking-widest opacity-80 hover:opacity-100"
                >
                    About
                </Button>
            </div>

            {/* Trending Jobs - Top Left */}
            <div className="absolute top-6 left-6 z-20 hidden md:block text-left">
                <h3 className="text-[10px] font-bold text-[var(--md-sys-color-primary)] uppercase tracking-widest mb-2 opacity-70">
                    Trending Jobs
                </h3>
                <ul className="space-y-1">
                    {[
                        "Influencer",
                        "Software Engineer",
                        "Graphic Designer",
                        "Customer Service",
                        "Writer"
                    ].map((role) => (
                        <li key={role}>
                            <button
                                onClick={() => {
                                    setJobTitle(role);
                                    localStorage.setItem('jobTitle', role);
                                    router.push('/analysis');
                                }}
                                className="text-xs text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] hover:underline transition-colors cursor-pointer uppercase tracking-wider"
                            >
                                {role}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="z-10 w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--md-sys-color-on-background)]">
                        The Human Error 404
                    </h1>
                    <p className="text-[var(--md-sys-color-on-surface-variant)] text-base md:text-lg">
                        Your job called. It’s terminal.
                    </p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit} className="space-y-6 relative">
                        <div className="space-y-2">
                            <label htmlFor="job-title" className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                                Input Job Title / Role
                            </label>
                            <div className="relative">
                                <Input
                                    id="job-title"
                                    placeholder="Start typing your role..."
                                    value={jobTitle}
                                    onChange={handleInputChange}
                                    onFocus={() => setShowSuggestions(true)}
                                    required
                                    autoComplete="off"
                                    className="capitalize"
                                />
                                {showSuggestions && jobTitle && filteredJobs.length > 0 && (
                                    <ul className="absolute z-50 w-full mt-2 bg-[var(--md-sys-color-surface-container-high)] rounded-[16px] shadow-xl max-h-60 overflow-auto py-2">
                                        {filteredJobs.map((role) => (
                                            <li
                                                key={role}
                                                className="px-6 py-3 text-sm text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)] cursor-pointer transition-colors"
                                                onClick={() => handleSuggestionClick(role)}
                                            >
                                                {role}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={!allRoleTerms.some(term => term.toLowerCase() === jobTitle.toLowerCase())}
                        >
                            Initiate Analysis
                        </Button>
                    </form>
                </Card>

                <div className="flex justify-center gap-4 text-[10px] font-medium tracking-widest text-[var(--md-sys-color-outline)] uppercase">
                    <span className="bg-[var(--md-sys-color-surface-container)] px-3 py-1 rounded-full">System: Online</span>
                    <span className="bg-[var(--md-sys-color-surface-container)] px-3 py-1 rounded-full">Models: Loaded</span>
                </div>
            </div>
            <PixelRobot />

            <Modal
                isOpen={showAbout}
                onClose={() => setShowAbout(false)}
                title="Manifesto"
            >
                <div className="text-base">
                    {renderAboutContent()}
                </div>
            </Modal>

            <Modal
                isOpen={showContact}
                onClose={() => setShowContact(false)}
                title="Contact Me"
            >
                <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="contact-name" className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                            Name
                        </label>
                        <Input
                            id="contact-name"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            required
                            placeholder="Your Name"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="contact-email" className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                            Email
                        </label>
                        <Input
                            id="contact-email"
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            required
                            placeholder="your@email.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="contact-message" className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">
                            Message
                        </label>
                        <Textarea
                            id="contact-message"
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            required
                            placeholder="Tell me something..."
                        />
                    </div>
                    <div className="pt-4 space-y-3">
                        {sendResult && (
                            <div className={`text-sm p-3 rounded-md ${sendResult.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {sendResult.message}
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={isSending}>
                            {isSending ? 'Sending...' : 'Send Message'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </main>
    );
}
