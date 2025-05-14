const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 8080;

// Initialize SQLite database?
const db = new sqlite3.Database('./db/database.sqlite');

// this middleware will be used to handle URL-encoded form data and raw POST data
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));  // this'll Handles form data in the URL-encoded format

//me
app.post('/clear-results', (req, res) => {
  db.run("DELETE FROM results", (err) => {
    if (err) {
      console.error('Error clearing results:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Results cleared successfully' });
  });
});

// I put this as it clears all my race results
app.delete('/api/results', (req, res) => {
  db.run("DELETE FROM results", (err) => {
    if (err) {
      console.error('Failed to clear results:', err.message);
      return res.status(500).json({ error: 'Failed to clear results' });
    }
    res.json({ message: 'All results cleared successfully' });
  });
});


// Manually handles raw POST data (for my JSON parsing)
app.use((req, res, next) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      if (body) {
        req.body = JSON.parse(body);  // Manually parses incoming JSON body
      } else { 
        req.body = {};
      }
    } catch (err) {
      console.error('Invalid JSON:', err);
      return res.status(400).json({ error: 'Invalid JSON' });  
    }
    next();
  });
});

// Home route (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve start.html directly from my static folder
app.get('/start', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'start.html'));
});

// Serves the results.html page
app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

// Serve my race results as JSON for the frontend to fetch
app.get('/api/results', (req, res) => {
  db.all("SELECT * FROM results ORDER BY finish_time ASC", (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);  // Sending JSON response to the frontend
  });
});

// Uploads race results (expecting a POST request with an array of results)
app.post('/upload', (req, res) => {
  const results = req.body.results;  // array of objects
  console.log('Received results:', results);

  if (!Array.isArray(results)) {
    return res.status(400).send('Invalid results format');
  }

  const stmt = db.prepare("INSERT INTO results (runner_id, finish_time) VALUES (?, ?)");

  results.forEach(({ id, time }) => {
    stmt.run(id, time);  // Uses the actual runner ID and finish time string
  });

  stmt.finalize();

  res.json({ message: "Results uploaded successfully" });
});

// debugging
app.use((req, res) => {
  res.status(404).send('Route not found');
});

// Starts the server
app.listen(port, () => {
  console.log(`Race Timer app running at http://localhost:${port}`);
});
