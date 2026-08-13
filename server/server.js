const express = require("express");

const app = express();

const PORT = 3000;

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Kaivan backend is running"
    });
});

app.listen(PORT, () => {
    console.log(`Kaivan backend running on port ${PORT}`);
});