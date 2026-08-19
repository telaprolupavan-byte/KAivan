const express = require("express");
const path = require("path");
const stones = require("./data/stones");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "..")));

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

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Kaivan backend running on port ${PORT}`);
});