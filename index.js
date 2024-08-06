import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import env from "dotenv";

const app = express();
env.config();
const port = process.env.PORT;

const db = new pg.Client({
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
});

try {
  db.connect();
} catch (error) {
  console.error(error);
}

//function to find a particular book from the 'books' table
async function getBook(isbn_id) {
  data = await db.query(
    "SELECT notes.id, books.ISBN_id, title, cover_page_reff, author, mini_review, notes, rating, date_of_read FROM notes JOIN books ON notes.ISBN_id = books.ISBN_id WHERE notes.ISBN_id = $1",
    [isbn_id]
  );

  return data.rows;
}

//Sample data for testing
let data = [];

//Middlewares
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

//Landing Page
app.get("/", async (req, res) => {
  data = await db.query(
    "SELECT notes.id, books.ISBN_id, title, cover_page_reff, author, mini_review, notes, rating, date_of_read FROM notes JOIN books ON books.ISBN_id = notes.ISBN_id"
  );

  res.render("index.ejs", {
    data: data.rows,
  });
});

//Notes
app.post("/notes", async (req, res) => {
  const book = await getBook(req.body.ISBN_id);

  res.render("notes.ejs", {
    books: book,
  });
});

//Filter
app.post("/filter", async (req, res) => {
  const book = await getBook(req.body.ISBN_id);

  res.render("index.ejs", {
    data: book,
  });
});

//Sort
app.post("/sort", async (req, res) => {
  data = await db.query(
    `SELECT notes.id, books.ISBN_id, title, cover_page_reff, author, mini_review, notes, rating, date_of_read FROM notes JOIN books ON books.ISBN_id = notes.ISBN_id ORDER BY ${req.body.criteria} DESC;`
  );

  res.render("index.ejs", {
    data: data.rows,
  });
});

//newNotes
app.post("/newNotes", async (req, res) => {
  const data = await getBook(req.body.isbn_id);

  res.render("newNotes.ejs", {
    body: data[0],
  });
});

//updateNotes
app.post("/updateNotes/:isbn_id", async (req, res) => {
  // console.log(req.body);

  const result = await db.query(
    `UPDATE notes SET notes = $1 WHERE isbn_id = $2 RETURNING *;`,
    [req.body.notes, req.params.isbn_id]
  );

  // console.log(result.rows);

  res.redirect("/");
});

//newBook
app.get("/newBook", (req, res) => {
  res.render("newBook.ejs");
});

//addBook
app.post("/addBook", async (req, res) => {
  // console.log(req.body.isbn_id);
  const rating = parseFloat(req.body.rating);
  let cover_page_reff = `https://covers.openlibrary.org/b/isbn/${req.body.isbn_id}-L.jpg`;

  const book = await db.query(
    `INSERT INTO books(isbn_id, cover_page_reff, title, author) VALUES ($1, $2, $3, $4) RETURNING *;`,
    [req.body.isbn_id, cover_page_reff, req.body.title, req.body.author]
  );
  // console.log(book.rows);

  const note = await db.query(
    `INSERT INTO notes(isbn_id, rating, mini_review, date_of_read) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.body.isbn_id, rating, req.body.mini_review, req.body.date_of_read]
  );
  // console.log(note.rows)

  res.redirect("/");
});

//Starting the server
app.listen(port, (req, res) => {
  console.log(`Server is running on http://localhost:${port}`);
});
