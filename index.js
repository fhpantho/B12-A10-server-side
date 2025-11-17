require('dotenv').config(); // Load env variables

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_CLUSTER}/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db(process.env.MONGO_DB);
    const HabbitCollection = db.collection("habit");
    const TrackHabbit = db.collection("TrackHabbit");

    console.log("Server connected to MongoDB successfully!");

    // ===== HABBITS ROUTES =====

    // Get habits
    app.get("/habbits", async (req, res) => {
      try {
        const { userEmail, category, search, home } = req.query;
        const query = {};

        if (userEmail) query.userEmail = userEmail;
        if (category && category !== "All") query.category = category;

        let cursor = HabbitCollection.find(query).sort({ _id: -1 });

        if (home === "true") cursor = cursor.limit(6);

        let results = await cursor.toArray();

        if (search && search.trim() !== "") {
          const s = search.toLowerCase();
          results = results.filter((h) =>
            h.title.toLowerCase().includes(s)
          );
        }

        res.status(200).send(results);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Get habit by ID
    app.get("/habbits/:id", async (req, res) => {
      try {
        const habit = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
        res.status(200).send(habit);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Create habit
    app.post("/habbits", async (req, res) => {
      try {
        const result = await HabbitCollection.insertOne(req.body);
        res.status(201).send({ message: "Habbit created", result });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Update habit - only owner
    app.patch("/habbits/:id", async (req, res) => {
      try {
        const { userEmail, title, description, category, reminderTime, image } = req.body;
        if (!userEmail) return res.status(400).send({ message: "userEmail required" });

        const habit = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!habit) return res.status(404).send({ message: "Habbit not found" });
        if (habit.userEmail !== userEmail)
          return res.status(403).send({ message: "You can only update your own habit" });

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

    // Mark complete (only owner)
    app.patch("/habbits/:id/complete", async (req, res) => {
      try {
        const { userEmail } = req.body;
        if (!userEmail) return res.status(400).send({ message: "userEmail required" });

        const habit = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!habit) return res.status(404).send({ message: "Habit not found" });
        if (habit.userEmail !== userEmail)
          return res.status(403).send({ message: "You can only update your own habit" });

        const today = new Date().toISOString().split("T")[0];
        const completionHistory = habit.completionHistory || [];

        if (completionHistory.includes(today)) {
          return res.status(400).send({ message: "Already marked completed today" });
        }

        completionHistory.push(today);

        const result = await HabbitCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { completionHistory } }
        );

        res.status(200).send({ message: "Habit marked complete", result, completionHistory });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Delete habit - only owner
    app.delete("/habbits/:id", async (req, res) => {
      try {
        const { userEmail } = req.body;
        if (!userEmail) return res.status(400).send({ message: "userEmail required" });

        const habit = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!habit) return res.status(404).send({ message: "Habbit not found" });
        if (habit.userEmail !== userEmail)
          return res.status(403).send({ message: "You can only delete your own habit" });

        const result = await HabbitCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.status(200).send({ message: "Habbit deleted successfully", result });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

  } finally {

  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("App is running"));

app.listen(port, () => console.log(`App running on port ${port}`));
