
// importing express js
const express = require("express");

// importing cors
const cors = require("cors");

// importing mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");


// creating express apps
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://FHPantho:FahimHossen@curd-operation.qdpi2ox.mongodb.net/?appName=curd-operation";

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

    const mydb = client.db("Habit_tracker_db");
    const HabbitCollection = mydb.collection("habit");
    const TrackHabbit = mydb.collection("TrackHabbit");

    // ===== HABBITS ROUTES =====

   app.get("/habbits", async (req, res) => {
  try {
    const { userEmail, category, search, home } = req.query;

    const query = {};

    // Filter by specific user (if provided)
    if (userEmail) query.userEmail = userEmail;

    // Filter by category
    if (category && category !== "All") {
      query.category = category;
    }

    // 1) First get from DB using query (category + userEmail)
    let cursor = HabbitCollection.find(query).sort({ _id: -1 });

    // Home page -> limit 6 habits
    if (home === "true") {
      cursor = cursor.limit(6);
    }

    let results = await cursor.toArray();

    // 2) Apply search filtering (title)
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




    app.get("/habbits/:id", async (req, res) => {
      const result = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.send(result);
    });

    app.post("/habbits", async (req, res) => {
      const result = await HabbitCollection.insertOne(req.body);
      res.send({ message: "Habbit created", result });
    });

    // PATCH (update) a habbit - only owner
    app.patch("/habbits/:id", async (req, res) => {
      try {
        const { userEmail, title, description, category, reminderTime, image } = req.body;
        if (!userEmail) return res.status(400).send({ message: "userEmail required" });

        const habit = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!habit) return res.status(404).send({ message: "Habbit not found" });

        if (habit.userEmail !== userEmail)
          return res.status(403).send({ message: "You can only update your own habbit" });

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

        res.send({ message: "Habbit updated successfully", result });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    // Mark a habit as completed for today only user
app.patch("/habbits/:id/complete", async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).send({ message: "userEmail required" });
    }

    const habitId = req.params.id;
    const habit = await HabbitCollection.findOne({ _id: new ObjectId(habitId) });

    if (!habit) return res.status(404).send({ message: "Habit not found" });

    if (habit.userEmail !== userEmail)
      return res.status(403).send({ message: "You can only update your own habit" });

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // If completionHistory is missing create it
    const completionHistory = habit.completionHistory || [];

    // Check duplicate same day
    if (completionHistory.includes(today)) {
      return res.status(400).send({ message: "Already marked completed today" });
    }

    // Push today's date
    completionHistory.push(today);

    const result = await HabbitCollection.updateOne(
      { _id: new ObjectId(habitId) },
      { $set: { completionHistory } }
    );

    res.send({ message: "Habit marked complete", result, completionHistory });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});


    // DELETE a habbit - only owner
    app.delete("/habbits/:id", async (req, res) => {
      try {
        const { userEmail } = req.body;
        if (!userEmail) return res.status(400).send({ message: "userEmail required" });

        const habit = await HabbitCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!habit) return res.status(404).send({ message: "Habbit not found" });

        if (habit.userEmail !== userEmail)
          return res.status(403).send({ message: "You can only delete your own habbit" });

        const result = await HabbitCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send({ message: "Habbit deleted successfully", result });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    

    console.log("Server connected to MongoDB successfully!");
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("App is running"));

app.listen(port, () => console.log(`App running on port ${port}`));
