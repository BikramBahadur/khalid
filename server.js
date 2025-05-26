    // server.js

    const express = require("express");
    const mongoose = require("mongoose");
    const cors = require("cors");
    const multer = require("multer");
    const path = require("path");
    const fs = require("fs");
    require("dotenv").config();

    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve static uploads folder (for albums and blogs)
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));
    app.use(express.static("public"));

    // MongoDB connection
    mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
      .then(() => console.log("MongoDB connected"))
      .catch((err) => console.error(err));

    // ----- SCHEMAS & MODELS -----

    // Album schema & model
    const albumSchema = new mongoose.Schema({
      name: String,
      thumbnail: String,
      date: Date,
    });

    const Album = mongoose.model("Album", albumSchema);

    // Image schema & model
    const imageSchema = new mongoose.Schema({
      filename: String,
      album: String,
      date: Date,
    });

    const Image = mongoose.model("Image", imageSchema);



    // ----- MULTER STORAGE CONFIG -----
    // For albums & images (uploads root)
    const storageAlbums = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
      },
    });

    const uploadAlbums = multer({ storage: storageAlbums });

    // For blogs specifically, store in /uploads/blogs
    const blogsUploadPath = path.join(__dirname, "uploads", "blogs");
    if (!fs.existsSync(blogsUploadPath)) {
      fs.mkdirSync(blogsUploadPath, { recursive: true });
    }

    const storageBlogs = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, blogsUploadPath);
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
      },
    });

    const uploadBlogs = multer({ storage: storageBlogs });

    // ----- ROUTES -----

    // Create Album
    app.post("/create-album", uploadAlbums.single("thumbnail"), async (req, res) => {
      const { name } = req.body;
      if (!name || !req.file) return res.status(400).send("Missing data");

      const album = new Album({
        name,
        thumbnail: req.file.filename,
        date: new Date(),
      });
      await album.save();
      res.send("Album created");
    });

    // Get Albums with image count
    app.get("/albums", async (req, res) => {
      try {
        const albums = await Album.find().sort({ date: -1 });

        const albumData = await Promise.all(
          albums.map(async (album) => {
            const imageCount = await Image.countDocuments({ album: album.name });
            return {
              name: album.name,
              thumbnail: album.thumbnail,
              imageCount,
            };
          })
        );

        res.json(albumData);
      } catch (err) {
        console.error("Error fetching albums:", err);
        res.status(500).json({ error: "Failed to fetch albums" });
      }
    });

    // Delete Album and its Images
    app.delete("/albums/:name", async (req, res) => {
      const name = req.params.name;
      await Album.deleteOne({ name });
      const images = await Image.find({ album: name });
      for (let img of images) {
        const filePath = path.join(__dirname, "uploads", img.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await Image.deleteMany({ album: name });
      res.send("Album and images deleted");
    });

    // Upload Images to Album
    app.post("/upload-images", uploadAlbums.array("images", 10), async (req, res) => {
      const album = req.body.album;
      const files = req.files;
      if (!files || !album) return res.status(400).send("Missing data");

      const imageDocs = files.map((file) => ({
        filename: file.filename,
        album: album,
        date: new Date(),
      }));

      await Image.insertMany(imageDocs);
      res.send("Images uploaded");
    });

    // Get Images of an Album
    app.get("/album-images/:album", async (req, res) => {
      const album = req.params.album;
      const images = await Image.find({ album });
      res.json(images);
    });

    // Delete single Image
    app.delete("/images/:id", async (req, res) => {
      const id = req.params.id;
      const image = await Image.findById(id);
      if (image) {
        const filePath = path.join(__dirname, "uploads", image.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await Image.deleteOne({ _id: id });
      }
      res.send("Image deleted");
    });

    // ----- BLOG ROUTES -----



    //youtube video section 

    // Define Video Schema
    const videoSchema = new mongoose.Schema({
      title: { type: String, required: true },
      youtubeLink: { type: String, required: true },
      addedAt: { type: Date, default: Date.now }
    });

    const Video = mongoose.model('Video', videoSchema);

    // Add Video API
    app.post('/api/add-video', async (req, res) => {
      const { title, youtubeLink } = req.body;

      if (!title || !youtubeLink) {
        return res.status(400).json({ message: 'Title and YouTube link are required' });
      }

      try {
        const video = new Video({ title, youtubeLink });
        await video.save();
        res.status(200).json({ message: 'Video added successfully' });
      } catch (err) {
        console.error('Error adding video:', err);
        res.status(500).json({ message: 'Error adding video', error: err.message });
      }
    });

    // Get All Videos API
    app.get('/api/get-videos', async (req, res) => {
      try {
        const videos = await Video.find();
        res.status(200).json(videos);
      } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).json({ message: 'Error fetching videos', error: err.message });
      }
    });

    // Delete Video API
    app.delete('/api/delete-video/:id', async (req, res) => {
      try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });
        res.status(200).json({ message: 'Video deleted successfully' });
      } catch (err) {
        console.error('Error deleting video:', err);
        res.status(500).json({ message: 'Error deleting video', error: err.message });
      }
    });


    const blogSchema = new mongoose.Schema({
      title: String,
      description: String,
      image: String, // store image filename
      createdAt: { type: Date, default: Date.now }
    });

    const Blog = mongoose.model("Blog", blogSchema);

    // Create blog with image
    app.post("/blogs", uploadBlogs.single("image"), async (req, res) => {
      try {
        const { title, description } = req.body;
        if (!title || !description || !req.file) return res.status(400).send("Missing fields");

        const newBlog = new Blog({
          title,
          description,
          image: req.file.filename
        });

        await newBlog.save();
        res.status(201).send("Blog saved");
      } catch (err) {
        console.error(err);
        res.status(500).send("Failed to save blog");
      }
    });

    // Get all blogs
    app.get("/blogs", async (req, res) => {
      try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
      } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching blogs");
      }
    });

    // Delete blog
    app.delete("/blogs/:id", async (req, res) => {
      try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).send("Blog not found");

        // delete image file
        const imagePath = path.join(__dirname, "uploads", "blogs", blog.image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        await Blog.findByIdAndDelete(req.params.id);
        res.send("Blog deleted");
      } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting blog");
      }
    });



    // Resume Schema
    const resumeSchema = new mongoose.Schema({
      heading: String,
      image: String,
      createdAt: { type: Date, default: Date.now },
    });

    const Resume = mongoose.model("Resume", resumeSchema);

    // Resume Upload Folder
    const resumeUploadPath = path.join(__dirname, "uploads", "resumes");
    if (!fs.existsSync(resumeUploadPath)) {
      fs.mkdirSync(resumeUploadPath, { recursive: true });
    }

    // Multer Storage for Resumes
    const storageResume = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, resumeUploadPath);
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
      },
    });
    const uploadResume = multer({ storage: storageResume });

    // Add Resume
    app.post("/resumes", uploadResume.single("image"), async (req, res) => {
      const { heading } = req.body;
      if (!heading || !req.file) return res.status(400).send("Missing data");

      const resume = new Resume({
        heading,
        image: req.file.filename,
      });

      await resume.save();
      res.send("Resume saved");
    });

    // Get All Resumes
    app.get("/resumes", async (req, res) => {
      const resumes = await Resume.find().sort({ createdAt: -1 });
      res.json(resumes);
    });

    // Delete Resume
    app.delete("/resumes/:id", async (req, res) => {
      const resume = await Resume.findById(req.params.id);
      if (!resume) return res.status(404).send("Resume not found");

      const filePath = path.join(__dirname, "uploads", "resumes", resume.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await Resume.deleteOne({ _id: req.params.id });
      res.send("Resume deleted");
    });


    // Book Schema & Model
    const bookSchema = new mongoose.Schema({
      name: { type: String, required: true },
      link: { type: String, required: true },
      image: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    });

    const Book = mongoose.model("Book", bookSchema);

    // Book upload folder and multer setup
    const booksUploadPath = path.join(__dirname, "uploads", "books");
    if (!fs.existsSync(booksUploadPath)) {
      fs.mkdirSync(booksUploadPath, { recursive: true });
    }

    const storageBooks = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, booksUploadPath);
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
      },
    });
    const uploadBooks = multer({ storage: storageBooks });

    // POST /books - upload book info + image
    app.post("/books", uploadBooks.single("image"), async (req, res) => {
      try {
        const { name, link } = req.body;
        if (!name || !link || !req.file) return res.status(400).send("Missing data");

        const book = new Book({
          name,
          link,
          image: req.file.filename,
        });

        await book.save();
        res.status(201).send("Book saved");
      } catch (err) {
        console.error(err);
        res.status(500).send("Failed to save book");
      }
    });

    // GET /books - get all books
    app.get("/books", async (req, res) => {
      try {
        const books = await Book.find().sort({ createdAt: -1 });
        res.json(books);
      } catch (err) {
        console.error(err);
        res.status(500).send("Failed to fetch books");
      }
    });

    // DELETE /books/:id - delete book by id
    app.delete("/books/:id", async (req, res) => {
      try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).send("Book not found");

        const filePath = path.join(booksUploadPath, book.image);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await Book.deleteOne({ _id: req.params.id });
        res.send("Book deleted");
      } catch (err) {
        console.error(err);
        res.status(500).send("Failed to delete book");
      }
    });



// ... other parts of your server.js (schemas, routes, middleware) ...

// ----- CERTIFICATE SECTION (Ensure this is NOT duplicated) -----

// Certificate Schema & Model
const certificateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Certificate = mongoose.model("Certificate", certificateSchema);

// Certificate upload folder and multer setup
const certUploadPath = path.join(__dirname, "uploads", "certificates");
if (!fs.existsSync(certUploadPath)) {
  console.log(`Creating directory: ${certUploadPath}`); // Optional: for debugging
  fs.mkdirSync(certUploadPath, { recursive: true });
}

const storageCertificate = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, certUploadPath);
  },
  filename: function (req, file, cb) {
    // Using a more unique filename to avoid potential collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

const uploadCertificate = multer({
  storage: storageCertificate,
  fileFilter: function (req, file, cb) {
    // Basic image file filter
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
    }
    cb(null, true);
  }
});

// POST /certificates - upload certificate
app.post("/certificates", uploadCertificate.single("image"), async (req, res) => {
  try {
    const { title } = req.body; // Expects 'title' from form data
    if (!title || !req.file) {
      return res.status(400).send("Missing title or image file.");
    }

    const certificate = new Certificate({
      title,
      image: req.file.filename,
    });

    await certificate.save();
    res.status(201).send("Certificate saved successfully");
  } catch (err) {
    console.error("Error saving certificate:", err.message);
    if (err.message.includes('Only image files')) { // Check for our custom file filter error
        return res.status(400).send(err.message);
    }
    res.status(500).send("Failed to save certificate. Check server logs.");
  }
});

// GET /certificates - get all certificates
app.get("/certificates", async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    res.json(certificates);
  } catch (err) {
    console.error("Error fetching certificates:", err.message);
    res.status(500).send("Failed to fetch certificates. Check server logs.");
  }
});

// DELETE /certificates/:id - delete certificate by id
app.delete("/certificates/:id", async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).send("Certificate not found.");
    }

    const filePath = path.join(certUploadPath, certificate.image);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`); // Optional: for debugging
    } else {
      console.warn(`File not found for deletion: ${filePath}`); // Optional: for debugging
    }

    await Certificate.deleteOne({ _id: req.params.id }); // Or Certificate.findByIdAndDelete(req.params.id);
    res.send("Certificate deleted successfully.");
  } catch (err) {
    console.error("Error deleting certificate:", err.message);
    res.status(500).send("Failed to delete certificate. Check server logs.");
  }
});



const visitorSchema = new mongoose.Schema({
  ip: String,
  country: String,
  visitedAt: { type: Date, default: Date.now },
});
const Visitor = mongoose.model("Visitor", visitorSchema);

// Helper to get real IP
function getClientIp(req) {
  const xForwarded = req.headers["x-forwarded-for"];
  if (xForwarded) return xForwarded.split(",")[0];
  const ip = req.socket.remoteAddress;
  // Replace localhost IPs with public IP for development
  if (ip === "::1" || ip === "127.0.0.1") return "8.8.8.8"; // Simulated IP
  return ip;
}

// Track Visit Route
app.post("/api/track-visit", async (req, res) => {
  const ip = getClientIp(req);
  let country = "Unknown";

  try {
    const geo = await axios.get(`https://ipapi.co/${ip}/json/`);
    country = geo.data.country_name || "India";
  } catch (err) {
    console.error("GeoIP lookup failed:", err.message);
  }

  await Visitor.create({ ip, country });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = await Visitor.countDocuments();
  const today = await Visitor.countDocuments({ visitedAt: { $gte: startOfDay } });
  const month = await Visitor.countDocuments({ visitedAt: { $gte: startOfMonth } });

  res.json({ total, today, month });
});

// Get Country Data for Pie Chart
app.get("/api/country-data", async (req, res) => {
  const data = await Visitor.aggregate([
    {
      $group: {
        _id: {
          $cond: [
            {
              $or: [
                { $eq: ["$country", null] },
                { $eq: ["$country", ""] },
                { $eq: ["$country", "India"] }
              ]
            },
            "India",
            "$country"
          ],
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const labels = data.map(item => item._id || "India");
  const values = data.map(item => item.count);
  res.json({ labels, values });
});

// Get Day Data for Bar Chart
app.get("/api/day-data", async (req, res) => {
  const data = await Visitor.aggregate([
    {
      $group: {
        _id: { $dayOfWeek: "$visitedAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = Array(7).fill(0);
  data.forEach(d => {
    counts[d._id - 1] = d.count;
  });

  res.json({ labels: weekdays, values: counts });
});


// Schemas & Models
const articleSchema = new mongoose.Schema({
  title: String,
  thumbnail: String,
  date: { type: Date, default: Date.now },
});
const Article = mongoose.model("Article", articleSchema);

const articleImageSchema = new mongoose.Schema({
  filename: String,
  article: String,
  date: { type: Date, default: Date.now },
});
const ArticleImage = mongoose.model("ArticleImage", articleImageSchema);

// Ensure upload directories exist
const articlesUploadPath = path.join(__dirname, "uploads", "articles");
if (!fs.existsSync(articlesUploadPath)) {
  fs.mkdirSync(articlesUploadPath, { recursive: true });
}

const articleImagesUploadPath = path.join(__dirname, "uploads", "articleimages");
if (!fs.existsSync(articleImagesUploadPath)) {
  fs.mkdirSync(articleImagesUploadPath, { recursive: true });
}

// Multer storage for article thumbnails
const storageArticles = multer.diskStorage({
  destination: (req, file, cb) => cb(null, articlesUploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const uploadArticles = multer({ storage: storageArticles });

// Multer storage for article images
const storageArticleImages = multer.diskStorage({
  destination: (req, file, cb) => cb(null, articleImagesUploadPath),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const uploadArticleImages = multer({ storage: storageArticleImages });

// Middleware
app.use(express.json());

// Serve uploads folders statically
app.use("/uploads/articles", express.static(articlesUploadPath));
app.use("/uploads/articleimages", express.static(articleImagesUploadPath));

// ROUTES

// Create article with thumbnail
app.post("/create-article", uploadArticles.single("thumbnail"), async (req, res) => {
  const { title } = req.body;
  if (!title || !req.file) return res.status(400).send("Missing title or thumbnail");

  const article = new Article({
    title,
    thumbnail: req.file.filename,
    date: new Date(),
  });
  await article.save();
  res.send("Article created");
});

// Get all articles with image count
app.get("/articles", async (req, res) => {
  try {
    const articles = await Article.find().sort({ date: -1 });
    const articleData = await Promise.all(
      articles.map(async (article) => {
        const imageCount = await ArticleImage.countDocuments({ article: article.title });
        return {
          title: article.title,
          thumbnail: article.thumbnail,
          imageCount,
        };
      })
    );
    res.json(articleData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// Delete an article and all its images
app.delete("/articles/:title", async (req, res) => {
  const title = req.params.title;

  // Delete article thumbnail file
  const article = await Article.findOne({ title });
  if (article) {
    const thumbnailPath = path.join(articlesUploadPath, article.thumbnail);
    if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
  }

  await Article.deleteOne({ title });

  // Delete all article images files and DB entries
  const images = await ArticleImage.find({ article: title });
  for (let img of images) {
    const imagePath = path.join(articleImagesUploadPath, img.filename);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
  await ArticleImage.deleteMany({ article: title });

  res.send("Article and all related images deleted");
});

// Upload multiple images for an article
app.post("/upload-article-images/:article", uploadArticleImages.array("images", 20), async (req, res) => {
  const article = req.params.article;
  if (!req.files || req.files.length === 0) return res.status(400).send("No images uploaded");

  const imagesData = req.files.map(file => ({
    filename: file.filename,
    article,
    date: new Date(),
  }));

  await ArticleImage.insertMany(imagesData);
  res.send("Images uploaded successfully");
});

// Get all image filenames for an article
app.get("/article-images/:article", async (req, res) => {
  const article = req.params.article;
  const images = await ArticleImage.find({ article });
  // Return array of filenames only
  res.json(images.map(img => img.filename));
});

// Delete an image by article and filename
app.delete("/article-images/:article/:filename", async (req, res) => {
  const { article, filename } = req.params;
  const image = await ArticleImage.findOne({ article, filename });
  if (!image) return res.status(404).send("Image not found");

  const filePath = path.join(articleImagesUploadPath, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await ArticleImage.deleteOne({ _id: image._id });
  res.send("Image deleted");
});




// API Routes

// Get all todos
app.get('/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

const todoSchema = new mongoose.Schema({
  text: String,
  completed: { type: Boolean, default: false }
});

const Todo = mongoose.model('Todo', todoSchema);

app.post('/api/todos', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Task text is required' });
    const newTodo = new Todo({ text });
    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add todo' });
  }
});



// Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Toggle complete status
app.put('/api/todos/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});




    // ----- START SERVER -----
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
