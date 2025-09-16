const cron = require('node-cron');
const axios = require('axios');
const { getDuePosts, updatePostStatus } = require('./database');

// n8n webhook URL for immediate posting
const N8N_WEBHOOK_URL = 'https://automate.tech-takeover.net/webhook/8f109fee-9713-4709-8ec2-957935850dc0';

// Schedule job to check for due posts every 5 minutes
function startScheduler() {
    console.log('⏰ Starting post scheduler...');
    console.log('📅 Will check for due posts every 5 minutes');

    // Run every 5 minutes: */5 * * * *
    // For testing, you can use '* * * * *' (every minute)
    cron.schedule('*/5 * * * *', async () => {
        try {
            await checkAndProcessDuePosts();
        } catch (error) {
            console.error('❌ Error in scheduler:', error);
        }
    });

    console.log('✅ Scheduler started successfully');
}

// Check for due posts and process them
async function checkAndProcessDuePosts() {
    try {
        const duePosts = await getDuePosts();

        if (duePosts.length === 0) {
            console.log('📋 No posts due for posting');
            return;
        }

        console.log(`📬 Found ${duePosts.length} posts due for posting`);

        for (const post of duePosts) {
            await processPost(post);
        }

    } catch (error) {
        console.error('❌ Error checking for due posts:', error);
    }
}

// Process individual post by sending to n8n webhook
async function processPost(post) {
    console.log(`🚀 Processing post: "${post.product_title}" (ID: ${post.id})`);

    try {
        // Prepare payload in the format your n8n workflow expects
        const payload = {
            "Product Title": post.product_title,
            "Product Description": post.product_description,
            "Image URL": post.image_url,
            "Affiliate Link": post.affiliate_link,
            sessionId: post.session_id,
            action: 'confirm_publish'
        };

        console.log('📤 Sending to n8n webhook:', N8N_WEBHOOK_URL);

        // Send to n8n webhook
        const response = await axios.post(N8N_WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });

        if (response.status === 200) {
            // Success - update post status
            await updatePostStatus(post.id, 'posted', new Date().toISOString());
            console.log(`✅ Post "${post.product_title}" sent successfully to n8n`);
        } else {
            // Unexpected status code
            const errorMsg = `Unexpected response status: ${response.status}`;
            await updatePostStatus(post.id, 'failed', null, errorMsg);
            console.error(`❌ Failed to post "${post.product_title}": ${errorMsg}`);
        }

    } catch (error) {
        // Network error or other failure
        const errorMsg = error.message || 'Unknown error';
        await updatePostStatus(post.id, 'failed', null, errorMsg);
        console.error(`❌ Error posting "${post.product_title}":`, errorMsg);

        // Log more details for debugging
        if (error.response) {
            console.error('📝 Response data:', error.response.data);
            console.error('📝 Response status:', error.response.status);
        }
    }
}

// Manual trigger for testing (can be called from server.js)
async function triggerSchedulerManually() {
    console.log('🔧 Manual scheduler trigger...');
    await checkAndProcessDuePosts();
}

// Start the scheduler when this module is loaded
startScheduler();

module.exports = {
    startScheduler,
    triggerSchedulerManually,
    checkAndProcessDuePosts
};