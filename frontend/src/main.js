import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import axios from 'axios'

const app = createApp(App);

// Fetch global settings and provide them
async function fetchGlobalSettings() {
    try {
        const response = await axios.get('http://localhost:3000/settings', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        app.provide('globalSettings', response.data.data);
    } catch (error) {
        console.error('Error fetching global settings:', error);
        // Provide default settings if fetching fails
        app.provide('globalSettings', {
            blogName: '我的博客',
            navbarBackgroundColor: '#343a40',
            navbarTextColor: '#ffffff',
            customScripts: ''
        });
    }
}

fetchGlobalSettings().then(() => {
    app.use(router).mount('#app');
});