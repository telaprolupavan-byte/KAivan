// Prints a bcrypt hash for ADMIN_PASSWORD_HASH.
// Usage: npm run hash-password -- "<password>"
const bcrypt = require("bcrypt");

const password = process.argv[2];

if (!password || password.length < 12) {
    console.error('Usage: npm run hash-password -- "<password>" (at least 12 characters)');
    process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
    console.log(hash);
});
