import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Define the interface for a NewsItem from Convex
// This should match the structure of data returned by your `getRecentNews` query.
// Make sure fields like _id and _creationTime (added by Convex) are included if used.
interface NewsItem {
  _id: string; // Convex document ID
  _creationTime: number; // Convex creation time
  title: string;
  url: string;
  hnId?: string;
  points?: number;
  author?: string;
  ageText?: string;
  source: string;
  scrapedAt: number;
  summary?: string;
  processingState?: string;
  // Add any other fields you expect from the newsItems table
}

// Main App component
const App: React.FC = () => {
  // State to manage the number of items to display initially from the fetched list
  const [itemsToShow, setItemsToShow] = useState<number>(10);
  // State to store generated summaries (or rather, pre-fetched summaries)
  // We might simplify this if summaries are always part of the item from Convex
  const [displayedSummaries, setDisplayedSummaries] = useState<{ [key: string]: boolean }>({});

  // Fetch news items from Convex
  // The `useQuery` hook will keep the data fresh automatically.
  const newsItemsData = useQuery(api.news.getRecentNews, { limit: 30 }); // Fetch 30 items initially
  const newsItems: NewsItem[] = newsItemsData || []; // Provide a default empty array while loading

  // Loading state is implicitly handled by `newsItemsData` being undefined initially
  const loading = newsItemsData === undefined;

  // Function to handle loading more items (client-side for now)
  const handleLoadMore = (): void => {
    setItemsToShow(prev => prev + 5);
  };

  // Handler for displaying/hiding summary
  const handleToggleSummary = (itemId: string): void => {
    setDisplayedSummaries(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="min-h-screen bg-gray-900 font-inter antialiased text-gray-200">
      {/* Tailwind CSS CDN for styling */}
      <script src="https://cdn.tailwindcss.com"></script>
      {/* Google Fonts for Inter */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header Section */}
      <header className="bg-gray-900 p-4 border-b border-gray-700">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-blue-400">
            <span className="text-purple-400">Dev</span>Feed
          </h1>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <a href="#" className="text-gray-300 hover:text-blue-300 font-medium transition duration-200">Top</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-blue-300 font-medium transition duration-200">New</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-blue-300 font-medium transition duration-200">Ask</a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-blue-300 font-medium transition duration-200">Show</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
            <p className="mt-4 text-lg font-semibold text-gray-300 animate-pulse">Loading stories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.slice(0, itemsToShow).map((item: NewsItem) => (
              <div
                key={item._id} // Use Convex _id as key
                className="bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] border border-gray-700 overflow-hidden"
              >
                <div className="p-5">
                  <h2 className="text-xl font-bold text-gray-100 mb-2 leading-tight">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-300 transition duration-200"
                    >
                      {item.title}
                    </a>
                  </h2>
                  {/* Display the pre-fetched summary if available and toggled */}
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {/* Show original item.summary (from HN) or a placeholder if no AI summary yet */}
                    {item.summary && !item.summary.startsWith("Error:") && !displayedSummaries[item._id] ?
                      item.summary.split('\n')[0] : // Show first line of AI summary or original short summary
                      (item.ageText ? `Article from ${item.ageText}` : "Click to read more.") // Fallback if no summary
                    }
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mb-4 space-x-3">
                    {item.points && (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                        <span className="font-medium text-yellow-400">{item.points}</span>
                      </span>
                    )}
                    {item.author && (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                        <span className="font-medium text-green-400">{item.author}</span>
                      </span>
                    )}
                    {item.ageText && (
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
                        <span className="font-medium text-blue-400">{item.ageText}</span>
                      </span>
                    )}
                  </div>

                  {/* Button to toggle display of full AI-generated summary if available */}
                  {item.summary && !item.summary.startsWith("Error:") && (
                    <div className="flex flex-col space-y-3 mb-4">
                      <button
                        onClick={() => handleToggleSummary(item._id)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
                      >
                        {displayedSummaries[item._id] ? 'Hide Summary' : '✨ Show AI Summary'}
                      </button>
                      {displayedSummaries[item._id] && (
                        <div className="bg-gray-700 p-3 rounded-md text-gray-200 text-sm border border-gray-600">
                          <p>{item.summary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-center items-center pt-4 border-t border-gray-700">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 font-semibold text-sm transition duration-200"
                    >
                      Read Article
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button - client-side slicing */}
        {newsItems.length > itemsToShow && (
          <div className="flex justify-center mt-10">
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-lg hover:bg-blue-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && newsItems.length === 0 && (
          <div className="text-center text-gray-400 text-lg mt-10 font-medium">
            No DevFeed items found. Try again later or check the cron job status.
          </div>
        )}
      </main>

      {/* Footer Section */}
      <footer className="bg-gray-900 p-6 mt-12 border-t border-gray-700">
        <div className="container mx-auto text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} DevFeed. All rights reserved.</p>
          <p className="mt-2">
            News data powered by Convex & Hacker News. Summaries by Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
