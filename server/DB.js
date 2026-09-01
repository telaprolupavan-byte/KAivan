const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI);

async function connectToDatabase() {
    await client.connect();

    console.log("MongoDB connected successfully");

    return client.db("kaivan");
}

module.exports = connectToDatabase;