import { cronJobs } from 'convex/server';
import { api } from './_generated/api'; // Using internal as per the example

const crons = cronJobs();

crons.cron(
  'fetchNewsAndSummarize', // A unique name for the cron job
  '0 */8 * * *', // Cron schedule: "At minute 0 past every 8th hour"
  api.news.fetchAndProcessNews // The internal action to call
  // No arguments are passed to fetchAndProcessNews in this case
);

// Example of another job, if needed in the future:
// crons.interval(
//   "someOtherTask",
//   { minutes: 30 },
//   internal.someModule.someAction
// );

export default crons;
