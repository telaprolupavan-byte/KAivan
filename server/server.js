const express = require("express");
const stones = require("./data/stones");

const app = express();

const PORT = 3000;

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Kaivan backend is running"
    });
});
app.get("/api/stones", (req, res) => {
    res.json(stones);
});
app.get("/api/stones/:id", (req, res) => {
    const stone = stones[req.params.id];

    if (!stone) {
        return res.status(404).json({
            error: "Stone not found"
        });
    }

    res.json(stone);
});

app.listen(PORT, () => {
    console.log(`Kaivan backend running on port ${PORT}`);
});