const express = require('express');
const cors = require('cors');
const { saveScheduledPost, getAllScheduledPosts, deleteScheduledPost } = require('./database');
const { triggerSchedulerManually } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:8080',
        'https://instagram-post-generator.pages.dev'
    ];

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Instagram Scheduler Server is running',
        timestamp: new Date().toISOString()
    });
});

// Server time endpoint for frontend synchronization
app.get('/api/time', (req, res) => {
    const now = new Date();
    res.json({
        serverTime: now.toISOString(),
        serverTimestamp: now.getTime(),
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverLocalTime: now.toString(),
        serverOffset: now.getTimezoneOffset()
    });
});

// Schedule a post endpoint
app.post('/api/schedule', async (req, res) => {
    try {
        console.log('📅 Received schedule request:', req.body);

        // Extract data from request body (matches frontend format)
        const {
            'Product Title': productTitle,
            'Product Description': productDescription,
            'Image URL': imageUrl,
            'Affiliate Link': affiliateLink,
            'Schedule DateTime': scheduleDateTime,
            'Series Name': seriesName,
            sessionId
        } = req.body;

        // Validate required fields
        if (!productTitle || !productDescription || !imageUrl || !scheduleDateTime || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['Product Title', 'Product Description', 'Image URL', 'Schedule DateTime', 'sessionId']
            });
        }

        // Validate schedule date is in the future
        // Frontend sends datetime-local format (e.g., "2025-09-15T16:12")
        // Treat this as local server time for validation purposes
        const scheduledTime = new Date(scheduleDateTime);
        const now = new Date();

        // Allow a 5-minute buffer for timezone differences and processing delays
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Add debug logging to help troubleshoot timezone issues
        console.log('📅 Schedule validation:', {
            provided: scheduleDateTime,
            scheduledTime: scheduledTime.toString(),
            scheduledTimeISO: scheduledTime.toISOString(),
            now: now.toString(),
            nowISO: now.toISOString(),
            timeDifference: scheduledTime.getTime() - now.getTime(),
            timeDifferenceMinutes: Math.round((scheduledTime.getTime() - now.getTime()) / (1000 * 60)),
            isInFuture: scheduledTime > fiveMinutesAgo
        });

        if (scheduledTime <= fiveMinutesAgo) {
            return res.status(400).json({
                success: false,
                error: 'Scheduled time must be in the future (allowing 5-minute buffer)',
                provided: scheduleDateTime,
                scheduledTime: scheduledTime.toString(),
                current: now.toString(),
                timeDifferenceMinutes: Math.round((scheduledTime.getTime() - now.getTime()) / (1000 * 60))
            });
        }

        // Save to database
        const postData = {
            productTitle,
            productDescription,
            imageUrl,
            affiliateLink: affiliateLink || null,
            scheduleDateTime,
            seriesName: seriesName || null,
            sessionId
        };

        const result = await saveScheduledPost(postData);

        console.log('✅ Post scheduled successfully:', result);

        res.json({
            success: true,
            data: result,
            message: `Post scheduled for ${new Date(scheduleDateTime).toLocaleString()}`
        });

    } catch (error) {
        console.error('❌ Error scheduling post:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to schedule post',
            message: error.message
        });
    }
});

// Get all scheduled posts (for debugging/admin)
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await getAllScheduledPosts();
        res.json({
            success: true,
            data: posts,
            count: posts.length
        });
    } catch (error) {
        console.error('❌ Error fetching posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts',
            message: error.message
        });
    }
});

// Manual trigger endpoint for testing scheduler
app.post('/api/trigger-scheduler', async (req, res) => {
    try {
        console.log('🔧 Manual scheduler trigger requested');
        await triggerSchedulerManually();
        res.json({
            success: true,
            message: 'Scheduler triggered manually'
        });
    } catch (error) {
        console.error('❌ Error triggering scheduler:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger scheduler',
            message: error.message
        });
    }
});

// Delete a scheduled post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const result = await deleteScheduledPost(postId);

        if (result.deleted) {
            console.log(`🗑️ Deleted post ID: ${postId}`);
            res.json({
                success: true,
                message: 'Post deleted successfully',
                data: result
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

    } catch (error) {
        console.error('❌ Error deleting post:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete post',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Instagram Scheduler Server started');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log('🔗 API endpoints:');
    console.log(`   POST http://localhost:${PORT}/api/schedule`);
    console.log(`   GET  http://localhost:${PORT}/api/posts`);
    console.log(`   GET  http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});