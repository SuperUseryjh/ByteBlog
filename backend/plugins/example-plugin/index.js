module.exports = {
    init: (app, db, registerFrontendPage) => {
        app.get('/api/hello-plugin', (req, res) => {
            res.json({ message: 'Hello from My First Plugin!' });
        });

        app.get('/api/plugin-db-test', (req, res) => {
            db.get("SELECT COUNT(*) as postCount FROM posts", [], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: `There are ${row.postCount} posts in the database.` });
            });
        });

        // Register a new frontend page
        registerFrontendPage({
            path: '/plugin-page',
            name: 'PluginPage',
            componentTemplate: `<div><h1>Hello from Plugin Page!</h1><p>{{ pluginMessage }}</p></div>`,
            componentScript: `export default { data() { return { pluginMessage: 'This page was registered by a plugin.' } } }`,
            requiresAuth: false,
            requiresAdmin: false
        });

        // Override an existing frontend page (e.g., HomePage)
        registerFrontendPage({
            path: '/home-plugin', // The path of the page to override (can be anything, but name is key)
            name: 'OverriddenHomePage(moved)', // A unique name for the overridden component
            componentTemplate: `<div><h1>Hello from Plugin-Overridden Home Page!</h1><p>This content is from a plugin.</p></div>`,
            componentScript: `export default { name: 'OverriddenHomePageComponent' }`,
            requiresAuth: false,
            requiresAdmin: false,
            overridesRouteName: 'HomePage' // The name of the route to override
        });

        console.log('My First Plugin routes and frontend pages registered.');
    }
};