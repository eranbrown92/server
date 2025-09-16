const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'scheduled_posts.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeSchema();
    }
});

// Create tables if they don't exist
function initializeSchema() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS scheduled_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_title TEXT NOT NULL,
            product_description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            affiliate_link TEXT,
            schedule_datetime TEXT NOT NULL,
            series_name TEXT,
            session_id TEXT NOT NULL,
            status TEXT DEFAULT 'scheduled',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            posted_at TEXT,
            error_message TEXT
        )
    `;

    db.run(createTableSQL, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('✅ Database schema initialized');
        }
    });
}

// Save a scheduled post
function saveScheduledPost(postData) {
    return new Promise((resolve, reject) => {
        const {
            productTitle,
            productDescription,
            imageUrl,
            affiliateLink,
            scheduleDateTime,
            seriesName,
            sessionId
        } = postData;

        const insertSQL = `
            INSERT INTO scheduled_posts
            (product_title, product_description, image_url, affiliate_link,
             schedule_datetime, series_name, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertSQL, [
            productTitle,
            productDescription,
            imageUrl,
            affiliateLink,
            scheduleDateTime,
            seriesName,
            sessionId
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    message: 'Post scheduled successfully',
                    scheduled_for: scheduleDateTime
                });
            }
        });
    });
}

// Get posts that are due to be posted
function getDuePosts() {
    return new Promise((resolve, reject) => {
        const now = new Date().toISOString();

        const selectSQL = `
            SELECT * FROM scheduled_posts
            WHERE status = 'scheduled'
            AND schedule_datetime <= ?
            ORDER BY schedule_datetime ASC
        `;

        console.log('🔍 Checking for due posts...');
        console.log('📅 Current time:', now);

        // First, let's see all scheduled posts for debugging
        const debugSQL = `
            SELECT id, product_title, schedule_datetime, status
            FROM scheduled_posts
            WHERE status = 'scheduled'
            ORDER BY schedule_datetime ASC
        `;

        db.all(debugSQL, [], (debugErr, debugRows) => {
            if (!debugErr && debugRows.length > 0) {
                console.log('📋 All scheduled posts:');
                debugRows.forEach(post => {
                    const scheduled = new Date(post.schedule_datetime).toISOString();
                    const isDue = scheduled <= now;
                    console.log(`   ID ${post.id}: "${post.product_title}" scheduled for ${post.schedule_datetime} (ISO: ${scheduled}) - Due: ${isDue}`);
                });
            } else {
                console.log('📋 No scheduled posts found in database');
            }

            // Now get the actual due posts
            db.all(selectSQL, [now], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🎯 Found ${rows.length} posts due for posting`);
                    resolve(rows);
                }
            });
        });
    });
}

// Update post status after posting attempt
function updatePostStatus(postId, status, postedAt = null, errorMessage = null) {
    return new Promise((resolve, reject) => {
        const updateSQL = `
            UPDATE scheduled_posts
            SET status = ?, posted_at = ?, error_message = ?
            WHERE id = ?
        `;

        db.run(updateSQL, [status, postedAt, errorMessage, postId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: postId,
                    status: status,
                    changes: this.changes
                });
            }
        });
    });
}

// Get all scheduled posts (for admin/debugging)
function getAllScheduledPosts() {
    return new Promise((resolve, reject) => {
        const selectSQL = `
            SELECT * FROM scheduled_posts
            ORDER BY schedule_datetime DESC
        `;

        db.all(selectSQL, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Delete a scheduled post
function deleteScheduledPost(postId) {
    return new Promise((resolve, reject) => {
        const deleteSQL = `
            DELETE FROM scheduled_posts
            WHERE id = ?
        `;

        db.run(deleteSQL, [postId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: postId,
                    deleted: this.changes > 0,
                    changes: this.changes
                });
            }
        });
    });
}

// Close database connection
function closeDatabase() {
    return new Promise((resolve) => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('✅ Database connection closed');
            }
            resolve();
        });
    });
}

module.exports = {
    saveScheduledPost,
    getDuePosts,
    updatePostStatus,
    getAllScheduledPosts,
    deleteScheduledPost,
    closeDatabase
};