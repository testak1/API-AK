const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use('/api', createProxyMiddleware({ 
  target: 'https://your-sanity-api.sanity.io', // Sanity API URL
  changeOrigin: true 
}));

app.use(express.static('frontend/dist'));
app.listen(process.env.PORT || 3000);