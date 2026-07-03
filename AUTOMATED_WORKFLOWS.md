# Setting Up Automated Workflows

## Overview
Baku Scribe now includes automated workflows that can monitor topics, perform periodic searches, and save findings automatically to your notebooks.

## Features
- **Topic Monitoring**: Track specific topics and automatically save new findings
- **Keyword Filtering**: Refine results with custom keywords
- **Auto-Save**: Automatically save results to specified notebooks
- **Flexible Scheduling**: Run hourly, daily, weekly, or monthly

## Setting Up the Cron Job

To enable automatic workflow execution, you need to set up a cron job in your Supabase project.

### Step 1: Enable Required Extensions

1. Go to your Supabase project SQL Editor: https://supabase.com/dashboard/project/sckglgjydlbztxjupbsk/sql/new
2. Run the following SQL:

```sql
-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Create the Cron Job

Run this SQL to create a cron job that executes workflows every hour:

```sql
select
  cron.schedule(
    'execute-workflows-hourly',
    '0 * * * *', -- Every hour at minute 0
    $$
    select
      net.http_post(
          url:='https://sckglgjydlbztxjupbsk.supabase.co/functions/v1/execute-workflows',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNja2dsZ2p5ZGxienR4anVwYnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMzYzMjUsImV4cCI6MjA3MTkxMjMyNX0.3uZ0NUIN3yJsUgsCWdTKAhWf_DdLDiDske83hBpK3Yw"}'::jsonb,
          body:=concat('{"time": "', now(), '"}')::jsonb
      ) as request_id;
    $$
  );
```

### Step 3: Verify the Cron Job

Check that your cron job was created successfully:

```sql
SELECT * FROM cron.job;
```

## Using Workflows

### Creating a Workflow

1. Navigate to the Workflow Manager in your dashboard
2. Click "Create Workflow"
3. Configure:
   - **Name**: Give your workflow a descriptive name
   - **Description**: Explain what this workflow monitors
   - **Topics**: Add one or more topics to track (e.g., "Artificial Intelligence", "Quantum Computing")
   - **Keywords**: Optional filters to refine results (e.g., "breakthrough", "research")
   - **Save To**: Select which notebook should receive the findings
   - **Frequency**: Choose how often to run (hourly, daily, weekly, monthly)
   - **Max Results**: Number of findings to save per execution (1-20)

### Managing Workflows

- **Pause/Resume**: Temporarily stop a workflow without deleting it
- **Delete**: Remove a workflow and its execution history
- **View Results**: Check the notebook where results are saved

## Example Workflows

### AI Research Tracker
- **Topics**: "Artificial Intelligence", "Machine Learning"
- **Keywords**: "breakthrough", "research paper", "new model"
- **Frequency**: Daily
- **Max Results**: 5

### Tech News Monitor
- **Topics**: "Technology", "Startups"
- **Keywords**: "funding", "acquisition", "product launch"
- **Frequency**: Daily
- **Max Results**: 10

### Academic Papers
- **Topics**: "Quantum Physics", "Neuroscience"
- **Keywords**: "peer-reviewed", "study", "journal"
- **Frequency**: Weekly
- **Max Results**: 3

## Best Practices

1. **Start Small**: Begin with 1-2 workflows to understand the system
2. **Use Specific Topics**: More specific topics yield better results
3. **Refine with Keywords**: Use keywords to filter out noise
4. **Choose Appropriate Frequency**: Balance freshness with API limits
5. **Organize Notebooks**: Create dedicated notebooks for different workflow types

## Troubleshooting

### Workflows Not Executing
- Verify the cron job is set up correctly
- Check Edge Function logs: https://supabase.com/dashboard/project/sckglgjydlbztxjupbsk/functions/execute-workflows/logs

### No Results Found
- Try broader topics or remove keyword filters
- Check that the workflow status is "active"
- Verify your target notebook still exists

### Too Many Results
- Reduce max_results setting
- Add more specific keywords
- Increase frequency to spread results over time

## Advanced Configuration

### Custom Schedules

You can modify the cron schedule to run at specific times:

```sql
-- Daily at 9 AM
'0 9 * * *'

-- Every 6 hours
'0 */6 * * *'

-- Weekly on Monday at 8 AM
'0 8 * * 1'

-- First day of month at midnight
'0 0 1 * *'
```

### Multiple Cron Jobs

Create multiple jobs for different execution frequencies:

```sql
-- Fast workflows (hourly)
select cron.schedule('fast-workflows', '0 * * * *', $$...$$ );

-- Slow workflows (daily)
select cron.schedule('daily-workflows', '0 8 * * *', $$...$$ );
```

## API Integration

Workflows use:
- **Perplexity AI**: For web search and real-time information
- **Lovable AI**: For content analysis and finding extraction
- Both require valid API keys configured in Supabase Edge Function secrets

## Privacy & Security

- All workflow configurations are private to your account
- Results are only visible to you
- Workflow executions are logged for transparency
- You can delete workflows and their history at any time
