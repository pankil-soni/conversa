/**
 * delete-test-users.js
 * Removes all test users whose email ends in @conversa-test.dev.
 * Also deletes any conversations those users belong to and all
 * messages inside those conversations.
 *
 * Usage:
 *   node scripts/delete-test-users.js
 */

const connectDB = require("../db");
const User = require("../Models/User");
const Conversation = require("../Models/Conversation");
const Message = require("../Models/Message");

const TEST_EMAIL_SUFFIX = "@conversa-test.dev";

const run = async () => {
    await connectDB();

    // 1. Find all test users
    const testUsers = await User.find({ email: { $regex: `${TEST_EMAIL_SUFFIX}$` } });

    if (testUsers.length === 0) {
        console.log("No test users found — nothing to delete.");
        process.exit(0);
    }

    const testUserIds = testUsers.map((u) => u._id);
    console.log(`Found ${testUsers.length} test user(s).`);

    // 2. Find conversations that include any test user
    const conversations = await Conversation.find({
        members: { $in: testUserIds },
    });

    const convIds = conversations.map((c) => c._id);
    console.log(`Found ${convIds.length} conversation(s) involving test users.`);

    // 3. Delete messages in those conversations
    if (convIds.length > 0) {
        const { deletedCount: msgCount } = await Message.deleteMany({
            conversationId: { $in: convIds },
        });
        console.log(`  🗑  Deleted ${msgCount} message(s).`);

        // 4. Delete the conversations themselves
        const { deletedCount: convCount } = await Conversation.deleteMany({
            _id: { $in: convIds },
        });
        console.log(`  🗑  Deleted ${convCount} conversation(s).`);
    }

    // 5. Delete the test users
    const { deletedCount: userCount } = await User.deleteMany({
        _id: { $in: testUserIds },
    });
    console.log(`  🗑  Deleted ${userCount} test user(s).`);

    console.log("\nClean-up complete.");
    process.exit(0);
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
