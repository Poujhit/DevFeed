import {
  action,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import * as cheerio from 'cheerio'; // For parsing HTML

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface NewsItemData {
  title: string;
  url: string;
  hnId?: string;
  points?: number;
  author?: string;
  ageText?: string;
  source: string;
  summary?: string;
  processingState?: string;
}

// Helper function to call Gemini API
async function generateSummaryWithGemini(
  title: string,
  articleUrl: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      'GEMINI_API_KEY environment variable not set in Convex deployment settings.'
    );
    return 'Error: API key not configured.';
  }

  let articleContent = '';
  try {
    // Fetch with a User-Agent to be polite
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
      },
    });
    if (response.ok) {
      const text = await response.text();
      const $ = cheerio.load(text);
      // Try to get main content, fallback to body, limit size
      articleContent = (
        $('article').text() ||
        $('main').text() ||
        $('body').text()
      ).substring(0, 2000);
    } else {
      console.warn(
        `Failed to fetch content for ${articleUrl}: ${response.status}`
      );
    }
  } catch (fetchError) {
    console.warn(
      `Error fetching content for ${articleUrl}:`,
      fetchError instanceof Error ? fetchError.message : String(fetchError)
    );
  }

  const prompt = `Please provide a concise 2-3 sentence summary for a news article titled "${title}". The article is located at ${articleUrl}. Use the following extracted text for context if available, but prioritize the title and the general topic: ${articleContent}. Focus on the key information and main takeaway.`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5, // Adjusted for more factual summaries
      topK: 1,
      topP: 1,
      maxOutputTokens: 256, // Increased slightly for 2-3 sentences
    },
  };

  try {
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      let errorBody = 'Unknown error';
      try {
        const errorData = await geminiResponse.json();
        errorBody = errorData.error?.message || JSON.stringify(errorData);
      } catch (parseError) {
        // If parsing the error JSON fails, use the raw response text if possible
        try {
          errorBody = await geminiResponse.text();
        } catch (readTextError) {
          errorBody =
            'Failed to parse error response and failed to read response text.';
          console.warn(
            'Failed to read Gemini error response text:',
            readTextError
          );
        }
        console.warn(
          'Failed to parse Gemini error response as JSON:',
          parseError
        );
      }
      console.error('Gemini API error:', geminiResponse.status, errorBody);
      return `Error generating summary: ${geminiResponse.statusText} - ${errorBody}`;
    }

    const result = await geminiResponse.json();
    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      return result.candidates[0].content.parts[0].text.trim();
    }
    console.error('Gemini API response structure unexpected:', result);
    return 'Failed to generate summary: Unexpected API response.';
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return `Error generating summary: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Helper function to introduce a delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Action to fetch news from Hacker News, parse, and store with summary
export const fetchAndProcessNews = action({
  args: {},
  handler: async (ctx) => {
    console.log('Starting Hacker News scraping job...');
    const hackerNewsUrl = 'https://news.ycombinator.com/';
    let processedCount = 0; // Initialize here

    try {
      const response = await fetch(hackerNewsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Hacker News: ${response.status} ${response.statusText}`
        );
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      const itemsToProcess: NewsItemData[] = [];

      $('tr.athing').each((_, el) => {
        const id = $(el).attr('id');
        const titleElement = $(el).find('td.title > span.titleline > a');
        const title = titleElement.text().trim();
        let url = titleElement.attr('href');

        if (url && !url.startsWith('http')) {
          url = new URL(url, hackerNewsUrl).href; // Properly join relative URLs
        }

        if (title && url) {
          const subtext = $(el).next('tr').find('td.subtext');
          const pointsText = subtext.find('span.score').text();
          const points = pointsText
            ? parseInt(pointsText.split(' ')[0])
            : undefined;
          const author = subtext.find('a.hnuser').text().trim() || undefined;
          const ageElement = subtext.find('span.age > a');
          const ageText = ageElement.text().trim() || undefined;

          itemsToProcess.push({
            title,
            url,
            hnId: id,
            points,
            author,
            ageText,
            source: 'Hacker News',
          });
        }
      });

      console.log(`Found ${itemsToProcess.length} items from Hacker News.`);
      const maxItemsToProcess = 30; // Process up to 30 items

      for (const item of itemsToProcess) {
        if (processedCount >= maxItemsToProcess) {
          console.log(
            `Reached processing limit of ${maxItemsToProcess} items for this run.`
          );
          break;
        }

        const existingItem = await ctx.runQuery(
          internal.news.getNewsItemByUrl,
          { url: item.url }
        );
        if (existingItem) {
          // console.log(`Skipping existing item: ${item.title}`); // Optional: reduce log noise
          continue;
        }

        // Introduce a delay before processing each new item to respect API rate limits
        if (processedCount > 0) {
          // No delay before the very first item - rate limiting added
          await sleep(4000); // 4-second delay (60s / 15 RPM = 4s/request)
        }

        console.log(
          `Processing new item (${processedCount + 1}/${maxItemsToProcess}): ${item.title}`
        );
        let summary: string | null = null;
        let processingState = 'pending_summary';

        try {
          summary = await generateSummaryWithGemini(item.title, item.url);
          processingState =
            summary && !summary.startsWith('Error:')
              ? 'summarized'
              : 'failed_summary';
        } catch (e) {
          console.error(
            `Error during summary generation for ${item.title}:`,
            e
          );
          summary = `Error during summary generation: ${e instanceof Error ? e.message : String(e)}`;
          processingState = 'failed_summary';
        }

        await ctx.runMutation(internal.news.addNewsItem, {
          ...item,
          summary: summary || undefined,
          processingState,
          scrapedAt: Date.now(),
        });
        processedCount++;
        console.log(`Added item: ${item.title} with state: ${processingState}`);
      }
      console.log(`Finished processing. Added ${processedCount} new items.`);
    } catch (error) {
      console.error('Error in fetchAndProcessNews action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processed: processedCount,
      };
    }
    return { success: true, processed: processedCount };
  },
});

// Internal mutation to add a news item
export const addNewsItem = internalMutation({
  args: {
    title: v.string(),
    url: v.string(),
    hnId: v.optional(v.string()),
    points: v.optional(v.number()),
    author: v.optional(v.string()),
    ageText: v.optional(v.string()),
    source: v.string(),
    scrapedAt: v.number(),
    summary: v.optional(v.string()),
    processingState: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('newsItems', args);
  },
});

// Internal query to check for existing items by URL
export const getNewsItemByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('newsItems')
      .withIndex('by_url', (q) => q.eq('url', args.url))
      .first(); // Get the first match or null
  },
});

// Public query to get recent news items, ordered by scrapedAt descending
export const getRecentNews = query({
  args: { limit: v.optional(v.number()) }, // Optional limit for pagination
  handler: async (ctx, args) => {
    const numItems = args.limit || 30; // Default to 30 items if no limit specified
    return await ctx.db
      .query('newsItems')
      .withIndex('by_scrapedAt') // Use the new index
      .order('desc') // Order by the index (descending)
      .take(numItems);
  },
});
