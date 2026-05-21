const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

let transactions = [];

// Root route (fixes 403 issue)
app.get("/", (req, res) => {
    res.send("Backend is working 🚀");
});

// Add transaction
app.post("/add-transaction", (req, res) => {
    const { merchant, amount, category, type } = req.body;

    const newTransaction = {
        id: uuidv4(),
        merchant,
        amount,
        category,
        type,
        date: new Date()
    };

    transactions.push(newTransaction);

    res.json(newTransaction);
});

// Get transactions
app.get("/transactions", (req, res) => {
    console.log("Transactions requested");
    res.json(transactions);
});

// Dashboard
app.get("/dashboard", (req, res) => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
        totalSpending: total,
        count: transactions.length
    });
});

app.listen(8081, "127.0.0.1", () => {
    console.log("Server running on http://127.0.0.1:8081");
});