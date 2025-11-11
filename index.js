
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
      const { userEmail, category } = req.query;
      const quary = {};
      if (userEmail) quary.userEmail = userEmail;
      if (category) quary.category = category;

      const result = await HabbitCollection.find(quary).toArray();
      res.send(result);
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

    // ===== TRACKHABBIT ROUTES =====

    app.get("/trackhabbit/:habitId", async (req, res) => {
      const { habitId } = req.params;
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send({ message: "userEmail required" });

      const habit = await HabbitCollection.findOne({ _id: new ObjectId(habitId) });
      if (!habit) return res.status(404).send({ message: "Habbit not found" });

      const track = await TrackHabbit.findOne({ habitId: new ObjectId(habitId), userEmail });

      const today = new Date();
      const last30Days = [...Array(30)].map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        return d.toISOString().split("T")[0];
      });

      const completedDates = track?.completionHistory || [];
      const completedInLast30 = completedDates.filter(date => last30Days.includes(date));
      const progress = Math.round((completedInLast30.length / 30) * 100);

      let streak = 0;
      for (let i = 0; i < last30Days.length; i++) {
        if (completedDates.includes(last30Days[i])) streak++;
        else break;
      }

      res.send({ habit, progress, streak, completedDates });
    });

    app.post("/trackhabbit/:habitId/complete", async (req, res) => {
      const { habitId } = req.params;
      const { userEmail } = req.body;
      if (!userEmail) return res.status(400).send({ message: "userEmail required" });

      const today = new Date().toISOString().split("T")[0];

      const result = await TrackHabbit.updateOne(
        { habitId: new ObjectId(habitId), userEmail },
        { $addToSet: { completionHistory: today } },
        { upsert: true }
      );

      res.send({ message: "Habbit marked complete", result });
    });

    console.log("Server connected to MongoDB successfully!");
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => res.send("App is running"));

app.listen(port, () => console.log(`App running on port ${port}`));
