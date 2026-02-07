import React from 'react';

/**
 * Get a human-readable label for a bare URL based on its domain/path.
 */
function getLabelForUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');

    if (host === 'google.com') {
      if (parsed.pathname.startsWith('/maps')) return 'Open in Maps';
      if (parsed.pathname.startsWith('/travel/flights')) return 'Search Flights';
    }
    if (host === 'opentable.com') return 'Book on OpenTable';
    if (host === 'resy.com') return 'Book on Resy';
    if (host === 'booking.com') return 'Book on Booking.com';
    if (host === 'welcomepickups.com') return 'Book Transfer';
    if (host === 'airbnb.com') return 'View on Airbnb';
    if (host === 'yelp.com') return 'View on Yelp';
    if (host === 'tripadvisor.com') return 'View on TripAdvisor';

    // Fallback: use the domain name
    return host;
  } catch {
    return 'Open Link';
  }
}

/**
 * Parse inline formatting in text: **bold**, [text](url) markdown links, and bare https:// URLs.
 * Returns an array of strings and React elements for rendering.
 */
export function parseInlineFormatting(text: string, keyPrefix: string): (string | React.ReactElement)[] {
  if (!text) return [''];

  const result: (string | React.ReactElement)[] = [];
  // Combined regex: **bold**, [text](url) markdown links, or bare https://... URLs
  const inlineRegex = /\*\*(.*?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|(https?:\/\/[^\s\)]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Bold text: **text**
      result.push(
        <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined && match[3] !== undefined) {
      // Markdown link: [text](url)
      result.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          {match[2]}
        </a>
      );
    } else if (match[4] !== undefined) {
      // Bare URL: https://...
      result.push(
        <a
          key={`${keyPrefix}-url-${match.index}`}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          {getLabelForUrl(match[4])}
        </a>
      );
    }

    lastIndex = inlineRegex.lastIndex;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result.length > 0 ? result : [text];
}
