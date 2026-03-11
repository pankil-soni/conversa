/**
 * seed-test-users.js
 * Creates 20 test users in the database.
 * All test users have email addresses ending in @conversa-test.dev so the
 * delete script can cleanly remove them without touching real accounts.
 *
 * Usage:
 *   node scripts/seed-test-users.js
 */

const bcrypt = require("bcryptjs");
const connectDB = require("../db");
const User = require("../Models/User");

const TEST_EMAIL_SUFFIX = "@conversa-test.dev";
const TEST_PASSWORD = "Test@1234"; // shared password for all test users

const TEST_USERS = [
    { name: "Alice Summers",    about: "Coffee addict ☕ | Travel lover ✈️" },
    { name: "Bob Harrington",   about: "Full-stack dev by day, gamer by night 🎮" },
    { name: "Clara Nguyen",     about: "Designer & dreamer 🎨" },
    { name: "David Okonkwo",    about: "Entrepreneur & fitness junkie 💪" },
    { name: "Eva Petrov",       about: "ML engineer | cat person 🐱" },
    { name: "Frank Müller",     about: "Outdoor enthusiast 🏕️" },
    { name: "Grace Liu",        about: "Bookworm 📚 | Tea > coffee" },
    { name: "Hiro Tanaka",      about: "Anime fan & React developer ⚛️" },
    { name: "Isla MacGregor",   about: "Photographer capturing life 📷" },
    { name: "Jake Torres",      about: "Startup founder | pizza connoisseur 🍕" },
    { name: "Kayla Robinson",   about: "Nurse by profession, dancer at heart 💃" },
    { name: "Liam O'Brien",     about: "DevOps nerd ☁️ | Rugby fan 🏉" },
    { name: "Mia Andersson",    about: "Sustainability advocate 🌱" },
    { name: "Noah Smith",       about: "Backend wizard 🧙 | coffee over sleep" },
    { name: "Olivia Carter",    about: "Marketing guru & dog mom 🐶" },
    { name: "Pedro Alves",      about: "Football ⚽ | Mobile developer" },
    { name: "Quinn Andrews",    about: "Non-binary | artist & activist 🏳️‍🌈" },
    { name: "Rachel Kim",       about: "Chef-in-training 🍳 | food blogger" },
    { name: "Sam Patel",        about: "Security researcher 🔐" },
    { name: "Tina Brooks",      about: "UX researcher | coffee shop hopper ☕" },
];

const toSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const run = async () => {
    await connectDB();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);

    let created = 0;
    let skipped = 0;

    for (const u of TEST_USERS) {
        const email = `${toSlug(u.name)}${TEST_EMAIL_SUFFIX}`;
        const exists = await User.findOne({ email });

        if (exists) {
            console.log(`  ⏭  Skipped  ${email} (already exists)`);
            skipped++;
            continue;
        }

        const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&bold=true`;

        await User.create({
            name: u.name,
            email,
            password: hashedPassword,
            about: u.about,
            profilePic,
        });

        console.log(`  ✅ Created  ${u.name} <${email}>`);
        created++;
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped.`);
    console.log(`Test password for all accounts: ${TEST_PASSWORD}`);
    process.exit(0);
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
