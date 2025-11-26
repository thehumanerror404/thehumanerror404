'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import roastsData from '@/data/roasts.json';
import safeRoles from '@/data/safe_roles.json';
import { findBestMatch, resolveRoleAlias } from '@/lib/utils';
import { getGeminiMatch } from '../actions';

export default function ResultPage() {
    const [jobTitle, setJobTitle] = useState('');
    const [fullRoast, setFullRoast] = useState<string>('');
    const [displayedRoast, setDisplayedRoast] = useState<string>('');
    const [matchedTitle, setMatchedTitle] = useState('');
    const [isSafe, setIsSafe] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [replacementCost, setReplacementCost] = useState('');
    const [fullReplacementText, setFullReplacementText] = useState('');
    const [displayedReplacementText, setDisplayedReplacementText] = useState('');
    const [isTypingCost, setIsTypingCost] = useState(false);
    const [monthsLeft, setMonthsLeft] = useState<number>(0);
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        const storedJob = localStorage.getItem('jobTitle');
        if (storedJob) {
            setJobTitle(storedJob);

            (async () => {
                // Check if we have a pre-calculated result from the analysis page
                const storedResult = localStorage.getItem('analysisResult');

                if (storedResult) {
                    try {
                        const { matchedRole, isSafe: safeStatus } = JSON.parse(storedResult);

                        setMatchedTitle(matchedRole === 'Default' ? storedJob : matchedRole);
                        setIsSafe(safeStatus);

                        // Generate roast based on the pre-calculated match
                        generateRoast(matchedRole, safeStatus);

                        // Clear the stored result so it doesn't persist if user navigates back
                        localStorage.removeItem('analysisResult');
                        return;
                    } catch (e) {
                        console.error("Error parsing stored result", e);
                        // Fallback to recalculation
                    }
                }

                // Recalculation logic (fallback)
                // First, resolve any alias to canonical role
                const resolvedJob = resolveRoleAlias(storedJob);

                // Default fallback logic
                let bestMatchKey = 'Default';

                try {
                    const geminiMatch = await getGeminiMatch(resolvedJob);
                    if (geminiMatch && geminiMatch !== 'Default') {
                        bestMatchKey = geminiMatch;
                    } else {
                        // Fallback to local logic if Gemini fails or returns Default
                        const jobKeys = Object.keys(roastsData);
                        bestMatchKey = findBestMatch(resolvedJob, jobKeys);
                    }
                } catch (error) {
                    console.error("Gemini match failed, falling back to local", error);
                    const jobKeys = Object.keys(roastsData);
                    bestMatchKey = findBestMatch(resolvedJob, jobKeys);
                }

                setMatchedTitle(bestMatchKey === 'Default' ? storedJob : bestMatchKey);

                // Check if this role is safe from AI
                const isSafeRole = safeRoles.includes(bestMatchKey);
                setIsSafe(isSafeRole);

                generateRoast(bestMatchKey, isSafeRole);
            })();
        }
    }, []);

    const generateRoast = (matchKey: string, isSafeRole: boolean) => {
        // Get random roast
        const roasts = roastsData[matchKey as keyof typeof roastsData] || roastsData['Default'];
        const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

        // Replace placeholders
        const months = Math.floor(Math.random() * 24) + 1; // 1 to 24 months
        setMonthsLeft(months);
        const viability = (Math.random() * 10).toFixed(1); // 0.0 to 10.0%

        const processedRoast = randomRoast
            .replace('{months}', months.toString())
            .replace('{days}', months.toString()) // Fallback for any missed {days}
            .replace('{viability}', viability);

        setFullRoast(processedRoast);

        // Set replacement cost
        if (!isSafeRole) {
            const cost = Math.floor(Math.random() * 10);
            setReplacementCost(cost.toString());
            setFullReplacementText(`ESTIMATED REPLACEMENT COST: $${cost}.99/month`);
        }
    };

    // Typing animation effect for main roast
    useEffect(() => {
        if (!fullRoast) return;

        setIsTyping(true);
        setDisplayedRoast('');
        let currentIndex = 0;

        const typingInterval = setInterval(() => {
            if (currentIndex < fullRoast.length) {
                setDisplayedRoast(fullRoast.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                setIsTyping(false);
                clearInterval(typingInterval);
            }
        }, 30); // 30ms per character for realistic typing speed

        return () => clearInterval(typingInterval);
    }, [fullRoast]);

    // Typing animation effect for replacement cost (starts after main roast)
    useEffect(() => {
        if (!fullReplacementText || isTyping) return;

        // Add a small delay before starting the cost typing
        const startDelay = setTimeout(() => {
            setIsTypingCost(true);
            setDisplayedReplacementText('');
            let currentIndex = 0;

            const typingInterval = setInterval(() => {
                if (currentIndex < fullReplacementText.length) {
                    setDisplayedReplacementText(fullReplacementText.slice(0, currentIndex + 1));
                    currentIndex++;
                } else {
                    setIsTypingCost(false);
                    clearInterval(typingInterval);
                }
            }, 30); // Same typing speed

            return () => clearInterval(typingInterval);
        }, 300); // 300ms delay after main roast finishes

        return () => clearTimeout(startDelay);
    }, [fullReplacementText, isTyping]);

    const getShareText = () => {
        if (isSafe) {
            return `Human Error 404 just confirmed: I WIN CAPITALISM.\nRobots are scared of me. 🍺\nCheck yours before it’s too late:\nhttps://thehumanerror404.com\n#HumanError404`;
        } else {
            return `My job just got sentenced to death by Human Error 404.\nIt has ${monthsLeft} months left to live.\nSend thoughts, prayers, and a shovel.\nhttps://thehumanerror404.com\n#HumanError404`;
        }
    };

    const handleShare = (platform: 'twitter' | 'linkedin' | 'facebook' | 'copy') => {
        const text = getShareText();
        const url = 'https://thehumanerror404.com';

        switch (platform) {
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                break;
            case 'linkedin':
                // Use the feed share URL to allow pre-filling text
                window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(text);
                alert('Copied to clipboard!');
                break;
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-[var(--md-sys-color-background)]">
            <div className="w-full max-w-2xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className={`text-3xl md:text-5xl font-bold tracking-tight ${isSafe ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-error)]'
                        }`}>
                        {isSafe ? 'You Win Capitalism' : 'Your Career Has Been Laid Off'}
                    </h1>
                    <p className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
                        SUBJECT: {jobTitle || 'UNKNOWN'}
                    </p>
                    {matchedTitle !== jobTitle && matchedTitle !== 'Default' && (
                        <p className="text-xs text-[var(--md-sys-color-outline)]">
                            DETECTED ARCHETYPE: {matchedTitle.toUpperCase()}
                        </p>
                    )}
                </div>

                <Card className="bg-[var(--md-sys-color-surface-container)]">
                    <div className="prose max-w-none text-[var(--md-sys-color-on-surface)] text-sm md:text-base">
                        {(matchedTitle.toLowerCase() === 'branch manager' || jobTitle.toLowerCase() === 'branch manager') && (
                            <div className="mb-6 flex justify-center">
                                <img
                                    src="/branch_manager.png"
                                    alt="Branch Manager"
                                    className="rounded-[16px] shadow-md max-w-full h-auto"
                                />
                            </div>
                        )}
                        <p className="font-bold text-[var(--md-sys-color-primary)]">
                            ANALYSIS COMPLETE.
                        </p>
                        <p className="text-lg leading-relaxed">
                            {displayedRoast || "CALCULATING DEMISE..."}
                            {isTyping && <span className="animate-pulse">|</span>}
                        </p>
                        {!isSafe && (displayedReplacementText || isTypingCost) && (
                            <p className="text-sm text-[var(--md-sys-color-error)] mt-8 font-medium">
                                {displayedReplacementText}
                                {isTypingCost && <span className="animate-pulse">|</span>}
                            </p>
                        )}
                    </div>
                </Card>

                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                    <Link href="/">
                        <Button variant="secondary" className="w-full sm:w-auto">
                            One More For The Timeline
                        </Button>
                    </Link>
                    <Button
                        variant="primary"
                        onClick={() => setShowShare(true)}
                        className="w-full sm:w-auto"
                    >
                        Share The News
                    </Button>
                </div>
            </div>

            {/* Share Modal */}
            {showShare && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowShare(false)}>
                    <div
                        className="relative w-full max-w-md bg-[var(--md-sys-color-surface-container)] rounded-2xl shadow-2xl border border-[var(--md-sys-color-outline-variant)] p-6 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold mb-4 text-[var(--md-sys-color-on-surface)]">Share Result</h3>
                        <div className="bg-[var(--md-sys-color-surface)] p-4 rounded-lg mb-6 text-sm text-[var(--md-sys-color-on-surface-variant)] whitespace-pre-wrap border border-[var(--md-sys-color-outline-variant)]">
                            {getShareText()}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="secondary" onClick={() => handleShare('twitter')} className="text-xs">
                                Twitter / X
                            </Button>
                            <Button variant="secondary" onClick={() => handleShare('linkedin')} className="text-xs">
                                LinkedIn
                            </Button>
                            <Button variant="secondary" onClick={() => handleShare('facebook')} className="text-xs">
                                Facebook
                            </Button>
                            <Button variant="secondary" onClick={() => handleShare('copy')} className="text-xs">
                                Copy Text
                            </Button>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowShare(false)}
                                className="text-sm text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-on-surface)] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
