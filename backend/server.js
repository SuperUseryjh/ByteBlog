const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs'); // Add this line
const path = require('path'); // Add this line
const app = express();
const port = 3000;
const JWT_SECRET = 'your_jwt_secret_key'; // In a real app, use an environment variable

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // No token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token
        req.user = user;
        next();
    });
};

app.use(cors()); // Add this line for CORS
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database('./blog.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user'
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    return;
                }
                // Add a default admin user if not exists, only after users table is created
                db.get(`SELECT * FROM users WHERE username = 'admin'`, (err, row) => {
                    if (err) {
                        console.error('Error checking admin user:', err.message);
                    } else if (!row) {
                        bcrypt.hash('adminpass', 10, (err, hash) => {
                            if (err) {
                                console.error('Error hashing admin password:', err.message);
                                return;
                            }
                            db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', hash, 'admin'], (err) => {
                                if (err) {
                                    console.error('Error creating admin user:', err.message);
                                } else {
                                    console.log('Default admin user created.');
                                }
                            });
                        });
                    }
                });
            });
            db.run(`CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                postId INTEGER NOT NULL,
                author TEXT NOT NULL,
                content TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS dynamic_pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                componentTemplate TEXT NOT NULL,
                componentScript TEXT NOT NULL,
                requiresAuth INTEGER DEFAULT 0,
                requiresAdmin INTEGER DEFAULT 0,
                overridesRouteName TEXT DEFAULT NULL
            )`, (err) => {
                if (err) {
                    console.error('Error creating dynamic_pages table:', err.message);
                    return;
                }
                // Now that dynamic_pages table is guaranteed to exist, check its schema
                db.all(`PRAGMA table_info(dynamic_pages)`, (err, columns) => { // Use db.all here
                    if (err) {
                        console.error('Error checking dynamic_pages schema:', err.message);
                        return;
                    }
                    // Ensure columns is an array before using .some()
                    if (columns && !columns.some(col => col.name === 'overridesRouteName')) {
                        db.run(`ALTER TABLE dynamic_pages ADD COLUMN overridesRouteName TEXT DEFAULT NULL`, (err) => {
                            if (err) {
                                console.error('Error adding overridesRouteName column to dynamic_pages:', err.message);
                            } else {
                                console.log('Added overridesRouteName column to dynamic_pages table.');
                            }
                        });
                    }
                });
            });
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (err) => {
                if (err) {
                    console.error('Error creating settings table:', err.message);
                    return;
                }
                // Add default settings if not exists, only after settings table is created
                db.get(`SELECT COUNT(*) as count FROM settings`, (err, row) => {
                    if (err) {
                        console.error('Error checking settings table:', err.message);
                        return;
                    }
                    if (row.count === 0) {
                        db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['blogName', '我的博客']);
                        db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['navbarBackgroundColor', '#343a40']);
                        db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['navbarTextColor', '#ffffff']);
                        db.run(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['customScripts', '']);
                        console.log('Default settings added.');
                    }
                });
            });
        });
    }
});

// Function to load plugins
const loadPlugins = (app, db) => {
    const pluginsDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginsDir)) {
        console.warn('Plugins directory not found:', pluginsDir);
        return;
    }

    // Utility function for plugins to register frontend pages
    const registerFrontendPage = async (pageDefinition) => {
        const { path, name, componentTemplate, componentScript, requiresAuth = false, requiresAdmin = false, overridesRouteName = null } = pageDefinition;
        if (!path || !name || !componentTemplate || !componentScript) {
            console.error('Invalid page definition provided by plugin:', pageDefinition);
            return;
        }
        // Check if a page with the same path or name already exists
        db.get(`SELECT id FROM dynamic_pages WHERE path = ? OR name = ?`, [path, name], (err, row) => {
            if (err) {
                console.error('Error checking existing dynamic page:', err.message);
                return;
            }
            if (row) {
                // If exists, update it
                db.run(`UPDATE dynamic_pages SET name = ?, componentTemplate = ?, componentScript = ?, requiresAuth = ?, requiresAdmin = ?, overridesRouteName = ? WHERE id = ?`,
                    [name, componentTemplate, componentScript, requiresAuth ? 1 : 0, requiresAdmin ? 1 : 0, overridesRouteName, row.id], (err) => {
                        if (err) {
                            console.error('Error updating dynamic page from plugin:', err.message);
                        } else {
                            console.log(`Dynamic page '${name}' (path: ${path}) updated by plugin.`);
                        }
                    });
            } else {
                // Otherwise, insert new
                db.run(`INSERT INTO dynamic_pages (path, name, componentTemplate, componentScript, requiresAuth, requiresAdmin, overridesRouteName) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                    [path, name, componentTemplate, componentScript, requiresAuth ? 1 : 0, requiresAdmin ? 1 : 0, overridesRouteName], (err) => {
                        if (err) {
                            console.error('Error inserting dynamic page from plugin:', err.message);
                        } else {
                            console.log(`Dynamic page '${name}' (path: ${path}) registered by plugin.`);
                        }
                    });
            }
        });
    };

    fs.readdirSync(pluginsDir, { withFileTypes: true }).forEach(dirent => {
        if (dirent.isDirectory()) {
            const pluginPath = path.join(pluginsDir, dirent.name);
            const pluginEntryFile = path.join(pluginPath, 'index.js');
            const pluginPackageJson = path.join(pluginPath, 'package.json');

            if (fs.existsSync(pluginEntryFile) && fs.existsSync(pluginPackageJson)) {
                try {
                    const plugin = require(pluginEntryFile);
                    if (typeof plugin.init === 'function') {
                        plugin.init(app, db, registerFrontendPage); // Pass registerFrontendPage
                        console.log(`Plugin '${dirent.name}' loaded successfully.`);
                    } else {
                        console.warn(`Plugin '${dirent.name}' does not export an 'init' function.`);
                    }
                } catch (e) {
                    console.error(`Error loading plugin '${dirent.name}':`, e.message);
                }
            } else {
                console.warn(`Skipping '${dirent.name}': missing index.js or package.json.`);
            }
        }
    });
};

// GET route to fetch all dynamic pages (for frontend to consume)
app.get('/admin/dynamic-pages', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    db.all("SELECT * FROM dynamic_pages", [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
});

// Call loadPlugins after database initialization is complete
db.serialize(() => {
    // ... existing table creation and default data insertion ...
    // After all tables are created and default data is inserted, load plugins
    loadPlugins(app, db);
});

// User registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ message: 'Error hashing password' });
        }
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hash, 'user'], function(err) {
            if (err) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

// Protect routes that require authentication
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: `Welcome ${req.user.username}! You have ${req.user.role} role.` });
});

// Posts API
app.get('/posts', (req, res) => {
    db.all("SELECT * FROM posts ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
});

app.get('/posts/:id', (req, res) => {
    db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":row
        })
    });
});

app.post('/posts', authenticateToken, (req, res) => {
    const { title, content } = req.body;
    const author = req.user.username; // Author is the logged-in user
    if (!title || !content) {
        res.status(400).json({"error":"Please provide title and content"});
        return;
    }
    db.run(`INSERT INTO posts (title, content, author) VALUES (?, ?, ?)`, [title, content, author], function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, title, content, author }
        });
    });
});

app.put('/posts/:id', authenticateToken, (req, res) => {
    const { title, content } = req.body;
    const author = req.user.username; // Ensure only author can update or admin
    if (!title || !content) {
        res.status(400).json({"error":"Please provide title and content"});
        return;
    }

    db.get(`SELECT author FROM posts WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        if (!row) {
            res.status(404).json({"error": "Post not found"});
            return;
        }
        if (row.author !== author && req.user.role !== 'admin') {
            res.status(403).json({"error": "Unauthorized to update this post"});
            return;
        }

        db.run(
            `UPDATE posts SET
               title = ?,
               content = ?,
               author = ?
               WHERE id = ?`,
            [title, content, author, req.params.id],
            function (err) {
                if (err) {
                    res.status(400).json({"error": res.message});
                    return;
                }
                res.json({
                    message: "success",
                    data: { id: req.params.id, title, content, author },
                    changes: this.changes
                });
            }
        );
    });
});

app.delete('/posts/:id', authenticateToken, (req, res) => {
    const author = req.user.username;
    db.get(`SELECT author FROM posts WHERE id = ?`, [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        if (!row) {
            res.status(404).json({"error": "Post not found"});
            return;
        }
        if (row.author !== author && req.user.role !== 'admin') {
            res.status(403).json({"error": "Unauthorized to delete this post"});
            return;
        }

        db.run(
            `DELETE FROM posts WHERE id = ?`,
            req.params.id,
            function (err) {
                if (err) {
                    res.status(400).json({"error": res.message});
                    return;
                }
                res.json({"message":"deleted", changes: this.changes});
            }
        );
    });
});

// Comments API
app.get('/posts/:postId/comments', (req, res) => {
    db.all("SELECT * FROM comments WHERE postId = ? ORDER BY createdAt DESC", [req.params.postId], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
});

app.post('/posts/:postId/comments', (req, res) => {
    const { author, content } = req.body;
    const postId = req.params.postId;
    if (!author || !content) {
        res.status(400).json({"error":"Please provide author and content"});
        return;
    }
    db.run(`INSERT INTO comments (postId, author, content) VALUES (?, ?, ?)`, [postId, author, content], function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, postId, author, content }
        });
    });
});

// Settings API (Admin only)
app.get('/settings', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    db.all("SELECT key, value FROM settings", [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json({
            "message":"success",
            "data":settings
        })
    });
});

app.put('/settings', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const updates = req.body;
    const promises = Object.keys(updates).map(key => {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE settings SET value = ? WHERE key = ?`, [updates[key], key], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    });

    Promise.all(promises)
        .then(() => {
            res.json({ message: 'Settings updated successfully' });
        })
        .catch(err => {
            res.status(400).json({ "error": err.message });
        });
});

// User API (protected for admin)
app.get('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    db.all("SELECT id, username, role FROM users", [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
});

app.get('/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    db.get("SELECT id, username, role FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":row
        })
    });
});

// User creation (protected for admin, or via /register route)
app.post('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { username, password, role } = req.body;
    if (!username || !password) {
        res.status(400).json({"error":"Please provide username and password"});
        return;
    }
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ message: 'Error hashing password' });
        }
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hash, role || 'user'], function(err) {
            if (err) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            res.status(201).json({
                "message": "success",
                "data": { id: this.lastID, username, role: role || 'user' }
            });
        });
    });
});

app.put('/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    const { username, password, role } = req.body;
    if (!username && !password && !role) {
        res.status(400).json({"error":"No fields to update"});
        return;
    }
    let updates = [];
    let params = [];
    if (username) { updates.push("username = ?"); params.push(username); }
    if (password) { updates.push("password = ?"); params.push(bcrypt.hashSync(password, 10)); } // Hash new password
    if (role) { updates.push("role = ?"); params.push(role); }

    params.push(req.params.id);

    db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function (err) {
            if (err) {
                res.status(400).json({"error": res.message});
                return;
            }
            res.json({
                message: "success",
                data: { id: req.params.id, username, role },
                changes: this.changes
            });
        }
    );
});

app.delete('/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    db.run(
        `DELETE FROM users WHERE id = ?`,
        req.params.id,
        function (err) {
            if (err) {
                res.status(400).json({"error": res.message});
                return;
            }
            res.json({"message":"deleted", changes: this.changes});
        }
    );
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

app.get('/posts/:id', (req, res) => {
    db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":row
        })
    });
});

app.post('/posts', (req, res) => {
    const { title, content, author } = req.body;
    if (!title || !content || !author) {
        res.status(400).json({"error":"Please provide title, content, and author"});
        return;
    }
    db.run(`INSERT INTO posts (title, content, author) VALUES (?, ?, ?)`, [title, content, author], function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, title, content, author }
        });
    });
});

app.put('/posts/:id', (req, res) => {
    const { title, content, author } = req.body;
    if (!title || !content || !author) {
        res.status(400).json({"error":"Please provide title, content, and author"});
        return;
    }
    db.run(
        `UPDATE posts SET
           title = ?,
           content = ?,
           author = ?
           WHERE id = ?`,
        [title, content, author, req.params.id],
        function (err) {
            if (err) {
                res.status(400).json({"error": res.message});
                return;
            }
            res.json({
                message: "success",
                data: { id: req.params.id, title, content, author },
                changes: this.changes
            });
        }
    );
});

app.delete('/posts/:id', (req, res) => {
    db.run(
        `DELETE FROM posts WHERE id = ?`,
        req.params.id,
        function (err) {
            if (err) {
                res.status(400).json({"error": res.message});
                return;
            }
            res.json({"message":"deleted", changes: this.changes});
        }
    );
});

// User API (will be expanded for authentication)
app.get('/users', (req, res) => {
    db.all("SELECT id, username, role FROM users", [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
});

app.get('/users/:id', (req, res) => {
    db.get("SELECT id, username, role FROM users WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":row
        })
    });
});

// Basic user creation (for testing, will be replaced by registration)
app.post('/users', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        res.status(400).json({"error":"Please provide username and password"});
        return;
    }
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, password, role || 'user'], function(err) {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        res.status(201).json({
            "message": "success",
            "data": { id: this.lastID, username, role: role || 'user' }
        });
    });
});

app.put('/users/:id', (req, res) => {
    const { username, password, role } = req.body;
    if (!username && !password && !role) {
        res.status(400).json({"error":"No fields to update"});
        return;
    }
    let updates = [];
    let params = [];
    if (username) { updates.push("username = ?"); params.push(username); }
    if (password) { updates.push("password = ?"); params.push(password); } // In real app, hash password
    if (role) { updates.push("role = ?"); params.push(role); }

    params.push(req.params.id);

    db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function (err) {
            if (err) {
                res.status(400).json({"error": res.message});
                return;
            }
            res.json({
                message: "success",
                data: { id: req.params.id, username, role },
                changes: this.changes
            });
        }
    );
});

app.delete('/users/:id', (req, res) => {
    db.run(
        `DELETE FROM users WHERE id = ?`,
        req.params.id,
        function (err) {
            if (err) {
                res.status(400).json({"error": res.message});
                return;
            }
            res.json({"message":"deleted", changes: this.changes});
        }
    );
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
