# DevFeed

DevFeed is a news aggregator application that fetches top stories from Hacker News, generates AI-powered summaries using Gemini, and displays them in a clean, modern interface. It uses React for the frontend, Convex for the backend and database, and Vite as the build tool.

## Features

- **Hacker News Integration**: Fetches the latest stories from Hacker News.
- **AI Summaries**: Uses Google's Gemini 2.5 Flash model to generate concise summaries for each article.
- **Real-time Updates**: Leverages Convex for real-time data synchronization between backend and frontend.
- **Responsive Design**: Built with Tailwind CSS for a responsive experience across devices.
- **Scheduled Data Fetching**: Automatically scrapes and processes news at regular intervals using Convex cron jobs.
- **Optimistic Updates (Implicit)**: Convex handles optimistic updates for a smoother UX.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend & Database**: [Convex](https://convex.dev/)
- **AI Summarization**: Google Gemini API (2.50 Flash)
- **HTML Parsing (Backend)**: Cheerio

## Project Structure

```
/dev-feed
├── convex/                 # Convex backend functions, schema, and cron jobs
│   ├── schema.ts           # Database schema definition
│   ├── news.ts             # Functions for fetching, summarizing, and storing news
│   ├── crons.ts            # Scheduled cron jobs
│   └── _generated/         # Auto-generated Convex files (do not edit manually)
├── public/                 # Static assets
├── src/                    # Frontend React application source
│   ├── components/         # (Optional) React components
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # React application entry point (renders App)
│   ├── index.css           # Global styles
│   └── vite-env.d.ts       # Vite TypeScript environment types
├── .env.local              # Local environment variables (VITE_CONVEX_URL)
├── index.html              # Main HTML entry point for Vite
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration for the project
├── tsconfig.node.json      # TypeScript configuration for Node.js parts (like Vite config)
├── vite.config.ts          # Vite configuration
└── README.md               # This file
```

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- A Convex account and project set up.
- A Google Gemini API Key.

## Setup and Installation

1.  **Clone the repository (if applicable):**

    ```bash
    git clone <your-repository-url>
    cd dev-feed
    ```

2.  **Install frontend dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Convex:**

    - If you haven't already, log in to Convex:
      ```bash
      npx convex login
      ```
    - Link your project (if this is a new clone of an existing Convex project) or initialize a new Convex project within this directory following Convex CLI prompts.

4.  **Configure Environment Variables:**

    - **Convex Backend (Gemini API Key):**

      1.  Go to your Convex project dashboard.
      2.  Navigate to "Settings" -> "Environment Variables".
      3.  Add a new variable:
          - Name: `GEMINI_API_KEY`
          - Value: Your Google Gemini API Key

    - **Frontend (Convex URL):**
      1.  Create a file named `.env.local` in the root of your project.
      2.  Add your Convex deployment URL to this file:
          ```
          VITE_CONVEX_URL=https://your-project-name.convex.cloud
          ```
          Replace `https://your-project-name.convex.cloud` with your actual Convex project URL (found in the Convex dashboard).

5.  **Deploy Convex backend functions (including schema and cron jobs):**
    ```bash
    npx convex deploy
    ```
    This will also generate the necessary type files in `convex/_generated/`.

## Running the Application

1.  **Start the Convex development process (handles backend changes and code generation):**
    Open a terminal and run:

    ```bash
    npx convex dev
    ```

    Keep this running. It will show backend logs and automatically update your backend functions and schema as you save files in the `convex/` directory. It also provides the URL for your local Convex dev dashboard.

2.  **Start the Vite frontend development server:**
    Open another terminal and run:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will start the React application, typically available at `http://localhost:5173` (or another port if 5173 is busy).

## How it Works

1.  **Scheduled Task (Cron Job):** A Convex cron job (`convex/crons.ts` calling `convex/news.ts:fetchAndProcessNews`) runs every 8 hours.
2.  **Data Scraping:** The `fetchAndProcessNews` action fetches the top 30 articles from Hacker News using `cheerio` for HTML parsing.
3.  **Duplicate Check:** It checks if an article (by URL) already exists in the Convex database to avoid reprocessing.
4.  **Content Fetching & Summarization:** For each new article:
    - It attempts to fetch the initial content of the article (up to 2000 characters).
    - It calls the Google Gemini API (`gemini-2.0-flash`) with the article title and fetched content to generate a 2-3 sentence summary.
    - API calls are rate-limited with a 4-second delay between them to stay within Gemini's RPM limits.
5.  **Data Storage:** The article details (title, URL, points, author, etc.) and the generated summary (or an error message if summarization failed) are stored in the `newsItems` table in Convex.
6.  **Frontend Display:**
    - The React app (`src/App.tsx`) uses `useQuery` from `convex/react` to subscribe to the `getRecentNews` query in `convex/news.ts`.
    - This query fetches the latest news items, ordered by when they were scraped.
    - The frontend displays these items in a card layout.
    - Users can click to show/hide the AI-generated summary.

## Future Enhancements (Ideas)

- **User Authentication**: Allow users to save favorites or customize their feed.
- **Advanced Pagination/Infinite Scrolling**: Load more articles from the backend as the user scrolls.
- **Error Handling for Link Previews**: Implement robust fallbacks or custom UI for when link previews fail.
- **Custom Proxy for Link Previews**: Deploy a self-hosted proxy for `react-link-preview` for production stability.
- **Topic Filtering/Search**: Allow users to filter news by keywords or topics.
- **Manual Refresh**: Add a button to trigger a manual refresh/fetch of news.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
