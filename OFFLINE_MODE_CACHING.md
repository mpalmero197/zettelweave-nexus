# Offline Mode & Intelligent Caching

PendragonX now features a comprehensive offline mode that enables full functionality without an internet connection, combined with intelligent caching that learns your usage patterns.

## Features

### 1. **Offline Mode**
- Automatically detects when you're offline
- Continues to work seamlessly without internet
- Queues all changes for synchronization when back online
- Local storage backup of all your data
- Visual indicators showing offline status and pending changes

### 2. **Intelligent Caching**
- Learns your usage patterns based on time of day and day of week
- Pre-loads frequently accessed content automatically
- Reduces load times for commonly used cards, notes, and notebooks
- Adapts to your workflow over time

### 3. **Pattern Analysis**
- Tracks when you access different types of content
- Identifies patterns in your daily/weekly routines
- Predicts what you'll need before you need it
- Runs analysis every 10 minutes to stay current

## How It Works

### Activity Tracking
The system tracks:
- Card views
- Note access
- Searches
- Notebook usage
- Time of day (hour)
- Day of week

### Smart Pre-loading
Based on your patterns, the system:
1. Analyzes last 30 days of activity
2. Identifies top resources for each time window
3. Pre-loads predicted content automatically
4. Keeps cache fresh with 5-minute expiration

### Offline Synchronization
When offline:
1. All changes are saved locally
2. Operations are queued for sync
3. Visual indicator shows pending count
4. Automatic sync when connection returns

## Usage

### Viewing Status
Look for the indicators in the top-right corner:
- **Cloud/CloudOff** - Online/Offline status
- **Brain** - Intelligent cache active
- **Clock** - Pending changes count

### Manual Sync
Click the refresh button next to the offline indicator to manually trigger synchronization.

### Cache Statistics
Hover over the cache indicator to see:
- Number of cached items
- Pattern detection count
- Pre-loading status

## Database Tables

### user_activity_logs
Stores all user activity for pattern analysis:
- Activity type and resource information
- Time-based indexing (hour, day of week)
- Metadata for additional context

### cache_predictions
Stores learned patterns and predictions:
- Resource types and IDs to pre-load
- Time windows for each prediction
- Confidence scores (0.00-1.00)

## Edge Functions

### analyze-cache-patterns
- Analyzes activity logs
- Generates predictions
- Returns current predictions for time window
- Runs automatically every 10 minutes

## Hooks

### useOfflineMode
Manages offline functionality:
- Detects connection status
- Queues operations
- Syncs when online
- Stores/retrieves offline data

### useIntelligentCache
Handles intelligent caching:
- Fetches predictions
- Pre-loads content
- Manages cache lifecycle
- Provides cache statistics

### useActivityTracker
Tracks user activity:
- Logs all resource access
- Records time-based metadata
- Feeds pattern analysis

### useOfflineZettelCards
Example offline-enabled hook:
- Works online or offline
- Queues changes when offline
- Updates local cache
- Syncs automatically

## Best Practices

1. **Let it learn**: The system gets better over time as it learns your patterns
2. **Stay consistent**: Regular usage patterns improve predictions
3. **Check pending**: Before going offline, ensure previous changes are synced
4. **Monitor cache**: Use the indicators to verify the system is working

## Performance

- Cache duration: 5 minutes
- Analysis interval: 10 minutes
- Maximum cached items: 50 cards + 50 notes + all notebooks
- Prediction window: ±2 hours from current time
- Confidence threshold: 0.3 (30%)

## Security

- All offline data is tied to user ID
- RLS policies protect activity logs
- Cache predictions are user-specific
- No cross-user data leakage

## Troubleshooting

### Changes not syncing?
- Check if you're online
- Click manual sync button
- Check console for errors

### Cache not pre-loading?
- Use the app regularly to build patterns
- Wait for analysis cycle (10 minutes)
- Check if predictions were generated

### High storage usage?
- Clear offline data using browser dev tools
- The system automatically manages cache size
- Old cache entries are cleaned every minute
