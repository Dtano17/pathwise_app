export function getSeasonReplacement(text: string): string {
    if (!text) return text;

    const month = new Date().getMonth(); // 0 is Jan, 11 is Dec

    // Spring: March (2), April (3), May (4)
    // Summer: June (5), July (6), August (7)
    // Fall: September (8), October (9), November (10)
    // Winter: December (11), January (0), February (1)

    let currentSeason = 'winter';
    if (month >= 2 && month <= 4) currentSeason = 'spring';
    else if (month >= 5 && month <= 7) currentSeason = 'summer';
    else if (month >= 8 && month <= 10) currentSeason = 'fall';

    if (currentSeason === 'fall') {
        // Leave Thanksgiving plans as they are in the fall
        return text;
    }

    const replacements: Record<string, { regex: RegExp, spring: string, summer: string, winter: string }> = {
        thanksgiving: {
            regex: /thanksgiving/gi,
            spring: "Easter",
            summer: "4th of July",
            winter: "Holiday"
        },
        turkey: {
            regex: /turkey/gi,
            spring: "Ham",
            summer: "BBQ",
            winter: "Roast"
        },
        autumn: {
            regex: /autumn/gi,
            spring: "Spring",
            summer: "Summer",
            winter: "Winter"
        },
        fall: {
            regex: /\bfall\b/gi,
            spring: "spring",
            summer: "summer",
            winter: "winter"
        },
        "black friday": {
            regex: /black friday/gi,
            spring: "Spring Sale",
            summer: "Summer Sale",
            winter: "Holiday Sale"
        },
        "cyber monday": {
            regex: /cyber monday/gi,
            spring: "Spring Clearance",
            summer: "Summer Clearance",
            winter: "Holiday Clearance"
        }
    };

    let adaptedText = text;

    for (const [key, rules] of Object.entries(replacements)) {
        adaptedText = adaptedText.replace(rules.regex, (match) => {
            // Try to preserve basic casing: if original was fully uppercase, keep it uppercase.
            // If original starts with uppercase, capitalize the replacement.
            let replacement = rules[currentSeason as keyof typeof rules] as string;
            if (match === match.toUpperCase() && match.length > 1) {
                return replacement.toUpperCase();
            } else if (match[0] === match[0].toUpperCase()) {
                return replacement.charAt(0).toUpperCase() + replacement.slice(1);
            } else {
                return replacement.toLowerCase();
            }
        });
    }

    return adaptedText;
}

export function adaptPlanToSeason<T extends Record<string, any>>(plan: T): T {
    if (!plan) return plan;

    const adapted: any = { ...plan };

    if (typeof adapted.title === 'string') {
        adapted.title = getSeasonReplacement(adapted.title);
    }
    if (typeof adapted.description === 'string') {
        adapted.description = getSeasonReplacement(adapted.description);
    }
    if (typeof adapted.planSummary === 'string') {
        adapted.planSummary = getSeasonReplacement(adapted.planSummary);
    }
    if (typeof adapted.shareTitle === 'string') {
        adapted.shareTitle = getSeasonReplacement(adapted.shareTitle);
    }

    // Adapt tags array if exists
    if (Array.isArray(adapted.tags)) {
        adapted.tags = adapted.tags.map((tag: string) => getSeasonReplacement(tag));
    }

    // Also adapt tasks if they are included in the payload
    if (Array.isArray(adapted.tasks)) {
        adapted.tasks = adapted.tasks.map((task: any) => {
            const adaptedTask = { ...task };
            if (typeof adaptedTask.title === 'string') {
                adaptedTask.title = getSeasonReplacement(adaptedTask.title);
            }
            if (typeof adaptedTask.description === 'string') {
                adaptedTask.description = getSeasonReplacement(adaptedTask.description);
            }
            return adaptedTask;
        });
    }

    return adapted as T;
}
