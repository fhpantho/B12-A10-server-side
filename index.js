require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://habbit-tracker-fhpantho.netlify.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_CLUSTER}/?retryWrites=true&w=majority`;

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
let cachedClient = null;

async function connectDB() {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = await client.connect();
  return cachedClient;
}

// Habits routes

app.get("/habbits", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");

    const { userEmail, category, search, home, page, limit, sortBy } =
      req.query;
    const query = {};
    if (userEmail) query.userEmail = userEmail;
    if (category && category !== "All") query.category = category;

    // Determine sorting
    const sortOrder = sortBy === "oldest" ? 1 : -1; // Default to newest (-1)

    // For home page, use simple limit without pagination
    if (home === "true") {
      let cursor = HabbitCollection.find(query)
        .sort({ _id: sortOrder })
        .limit(6);
      let results = await cursor.toArray();

      if (search && search.trim() !== "") {
        const s = search.toLowerCase();
        results = results.filter((h) => h.title.toLowerCase().includes(s));
      }

      return res.status(200).send(results);
    }

    // Pagination logic
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    // Build cursor with sorting
    let cursor = HabbitCollection.find(query).sort({ _id: sortOrder });

    // Apply search filter before pagination for accurate count
    let allResults = await cursor.toArray();
    if (search && search.trim() !== "") {
      const s = search.toLowerCase();
      allResults = allResults.filter((h) => h.title.toLowerCase().includes(s));
    }

    // Get total count after search filter
    const totalHabits = allResults.length;
    const totalPages = Math.ceil(totalHabits / limitNum);

    // Apply pagination
    const paginatedResults = allResults.slice(skip, skip + limitNum);
    const hasMore = pageNum < totalPages;

    res.status(200).send({
      habits: paginatedResults,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalHabits: totalHabits,
        hasMore: hasMore,
      },
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/habbits/:id", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");

    const habit = await HabbitCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.status(200).send(habit);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.post("/habbits", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");

    const result = await HabbitCollection.insertOne(req.body);
    res.status(201).send({ message: "Habbit created", result });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.patch("/habbits/:id", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");

    const { userEmail, title, description, category, reminderTime, image } =
      req.body;
    if (!userEmail)
      return res.status(400).send({ message: "userEmail required" });

    const habit = await HabbitCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!habit) return res.status(404).send({ message: "Habbit not found" });
    if (habit.userEmail !== userEmail)
      return res
        .status(403)
        .send({ message: "You can only update your own habit" });

    const updateFields = {};
    if (title) updateFields.title = title;
    if (description) updateFields.description = description;
    if (category) updateFields.category = category;
    if (reminderTime) updateFields.reminderTime = reminderTime;
    if (image) updateFields.image = image;

    const result = await HabbitCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields }
    );

    res.status(200).send({ message: "Habbit updated successfully", result });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.patch("/habbits/:id/complete", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");

    const { userEmail } = req.body;
    if (!userEmail)
      return res.status(400).send({ message: "userEmail required" });

    const habit = await HabbitCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!habit) return res.status(404).send({ message: "Habit not found" });
    if (habit.userEmail !== userEmail)
      return res
        .status(403)
        .send({ message: "You can only update your own habit" });

    const today = new Date().toISOString().split("T")[0];
    const completionHistory = habit.completionHistory || [];

    if (completionHistory.includes(today)) {
      return res
        .status(400)
        .send({ message: "Already marked completed today" });
    }

    completionHistory.push(today);

    const result = await HabbitCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { completionHistory } }
    );

    res
      .status(200)
      .send({ message: "Habit marked complete", result, completionHistory });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.delete("/habbits/:id", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");

    const { userEmail } = req.body;
    if (!userEmail)
      return res.status(400).send({ message: "userEmail required" });

    const habit = await HabbitCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!habit) return res.status(404).send({ message: "Habbit not found" });
    if (habit.userEmail !== userEmail)
      return res
        .status(403)
        .send({ message: "You can only delete your own habit" });

    const result = await HabbitCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.status(200).send({ message: "Habbit deleted successfully", result });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/dashboard-stats", async (req, res) => {
  try {
    await connectDB();
    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");
    const { userEmail } = req.query;
    if (!userEmail)
      return res.status(400).send({ message: "userEmail required" });
    const habits = await HabbitCollection.find({ userEmail }).toArray();
    const totalHabits = habits.length;

    // Completed Today
    const today = new Date().toISOString().split("T")[0];
    const completedToday = habits.filter(
      (h) => h.completionHistory && h.completionHistory.includes(today)
    ).length;
    // Last 7 Days Completion Data
    const completionData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const count = habits.filter(
        (h) => h.completionHistory && h.completionHistory.includes(dateStr)
      ).length;

      completionData.push({
        date: dateStr,
        count: count,
      });
    }
    // Calculate Longest Streak
    let maxStreak = 0;
    habits.forEach((habit) => {
      if (!habit.completionHistory || habit.completionHistory.length === 0)
        return;

      const sortedDates = [...habit.completionHistory].sort(
        (a, b) => new Date(b) - new Date(a)
      );
      let currentStreak = 0;
      let checkDate = new Date();

      // Check today or yesterday to continue streak
      const todayStr = checkDate.toISOString().split("T")[0];
      if (!sortedDates.includes(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (sortedDates.includes(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    });
    res.status(200).send({
      totalHabits,
      completedToday,
      maxStreak,
      completionData,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Default root route

// Contact form endpoint
const nodemailer = require("nodemailer");
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields required" });
  }
  try {
    // Configure transporter (using Gmail SMTP for example)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.CONTACT_EMAIL_USER, // your gmail address
        pass: process.env.CONTACT_EMAIL_PASS, // your gmail app password
      },
    });
    await transporter.sendMail({
      from: `Habit Tracker Contact <${process.env.CONTACT_EMAIL_USER}>`,
      to: "fahim1020pantho@gmail.com",
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    });
    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

app.get("/", (req, res) => {
  res.send("App is running");
});

module.exports = app;

// const port = process.env.PORT || 5000;

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
