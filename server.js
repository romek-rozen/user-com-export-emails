const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Proxy endpoint for user.com API
app.get('/api/users', async (req, res) => {
    try {
        const { subdomain, token, cursor, with_email } = req.query;
        
        if (!subdomain || !token) {
            return res.status(400).json({ error: 'Missing subdomain or token' });
        }
        
        // Normalize subdomain - remove .user.com if present
        const normalizedSubdomain = subdomain.replace(/\.user\.com$/, '');
        
        let apiUrl = `https://${normalizedSubdomain}.user.com/api/public/users/`;
        
        // Add query parameters
        const params = new URLSearchParams();
        if (with_email) params.append('with_email', with_email);
        if (cursor) params.append('cursor', cursor);
        
        if (params.toString()) {
            apiUrl += '?' + params.toString();
        }
        
        console.log('Fetching:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Token ${token}`,
                'Accept': '*/*; version=2'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Open your browser and go to: http://localhost:3000');
});