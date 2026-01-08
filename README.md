Habit Tracker Server

Backend API for the Habit Tracker application built with Node.js, Express, and MongoDB, deployed on Vercel.

Table of Contents

Features

Tech Stack

Getting Started

Environment Variables

Available Endpoints

Example Requests

Deployment

Contact

Features

User-specific habit management

CRUD operations on habits

Mark habits as completed (track completion history)

Dashboard stats: total habits, completed today, streaks, last 7 days completion data

Contact form email integration

Supports pagination, search, and category filtering

Fully CORS-enabled for multiple frontends

Dark/light theme compatible

Tech Stack

Node.js

Express.js

MongoDB (Atlas)

Nodemailer (for contact form emails)

Vercel (serverless deployment)

Getting Started
Clone the repository
git clone https://github.com/yourusername/habit-tracker-server.git
cd habit-tracker-server

Install dependencies
npm install

Run locally
npm start


By default, the server runs on http://localhost:3000.

Environment Variables

Create a .env file in the root directory:

PORT=3000

# MongoDB credentials
MONGO_USER=your_mongo_username
MONGO_PASS=your_mongo_password
MONGO_DB=your_database_name
MONGO_CLUSTER=your_cluster_name.mongodb.net

# Email for contact form
CONTACT_EMAIL_USER=your_email@gmail.com
CONTACT_EMAIL_PASS=your_email_app_password


Make sure you generate a Gmail App Password if using Gmail for Nodemailer.

Available Endpoints
Habits
Method	Endpoint	Description	Body / Query Params
GET	/habbits	Fetch all habits for a user	userEmail, category, search, page, limit, sortBy, home
GET	/habbits/:id	Fetch a specific habit by ID	id (path)
POST	/habbits	Create a new habit	JSON body with userEmail, title, category, description, reminderTime, image
PATCH	/habbits/:id	Update a habit	JSON body with userEmail and fields to update
PATCH	/habbits/:id/complete	Mark a habit as completed for today	JSON body with userEmail
DELETE	/habbits/:id	Delete a habit	JSON body with userEmail
Dashboard
Method	Endpoint	Description	Query Params
GET	/dashboard-stats	Get total habits, completed today, streaks, last 7 days completion data	userEmail
Contact Form
Method	Endpoint	Description	Body
POST	/api/contact	Send email from contact form	name, email, message
Root
Method	Endpoint	Description
GET	/	Server health check
Example Requests
Fetch all habits
// Using axios
axios.get("https://habit-tracker-server-eight.vercel.app/habbits", {
  params: { userEmail: "user@example.com", page: 1, limit: 10 }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Fetch a single habit
axios.get("https://habit-tracker-server-eight.vercel.app/habbits/HABIT_ID")
  .then(res => console.log(res.data))
  .catch(err => console.error(err));

Create a habit
axios.post("https://habit-tracker-server-eight.vercel.app/habbits", {
  userEmail: "user@example.com",
  title: "Drink Water",
  category: "Health",
  description: "Drink 8 glasses daily",
  reminderTime: "08:00",
  image: "https://example.com/image.png"
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Update a habit
axios.patch("https://habit-tracker-server-eight.vercel.app/habbits/HABIT_ID", {
  userEmail: "user@example.com",
  title: "Drink More Water"
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Complete a habit
axios.patch("https://habit-tracker-server-eight.vercel.app/habbits/HABIT_ID/complete", {
  userEmail: "user@example.com"
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Delete a habit
axios.delete("https://habit-tracker-server-eight.vercel.app/habbits/HABIT_ID", {
  data: { userEmail: "user@example.com" }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Get dashboard stats
axios.get("https://habit-tracker-server-eight.vercel.app/dashboard-stats", {
  params: { userEmail: "user@example.com" }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Send contact form
axios.post("https://habit-tracker-server-eight.vercel.app/api/contact", {
  name: "John Doe",
  email: "john@example.com",
  message: "Hello! I need help."
})
.then(res => console.log(res.data))
.catch(err => console.error(err));

Deployment on Vercel

Make sure your project is connected to Vercel.

Add the environment variables in Vercel dashboard.

Deploy using Vercel CLI:

vercel --prod


Access your server at the provided URL.

Notes

Pagination is applied automatically in /habbits unless home=true is provided.

Habits completion streaks are calculated from completionHistory array.

Always provide userEmail in the requests for user-specific operations.

Contact

For issues or feature requests, email: fahim1020pantho@gmail.com