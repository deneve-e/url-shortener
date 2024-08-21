# URL Shortener API

## Overview

A simple URL Shortener API built with Nest.js, Redis for caching and rate limiting, and Firebase for storage. It allows users to shorten URLs, redirect to the original URL, and retrieve click statistics.

## Features

- **URL Shortening**: Generate a short code for a given URL.
- **URL Redirection**: Redirect to the original URL using the short code.
- **URL Statistics**: Track and retrieve click statistics.
- **Rate Limiting**: Limit requests to 10 per minute per IP address.
- **API Documentation**: Available via Swagger.

## Live API

- **Base URL**: [https://url-shortener-5g2w.onrender.com/](https://url-shortener-5g2w.onrender.com/)
- **Swagger Docs**: [https://url-shortener-5g2w.onrender.com/api](https://url-shortener-5g2w.onrender.com/api)

## API Endpoints

- `POST /shorten`: Shorten a URL
- `GET /:code`: Redirect to the original URL
- `GET /stats/:code`: Get statistics for a shortened URL

## Setup

### Prerequisites

- Node.js v14+
- Redis
- Firebase credentials JSON file

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/deneve-e/url-shortener.git
   cd url-shortener
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```plaintext
   REDIS_URL=redis://localhost:6379
   FIREBASE_CONFIG_PATH=./config/firebase.json
   ```
4. Start the application:
   ```bash
   npm run start
   ```
   The app will run at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm run test
```

## Deployment

This project is deployed on Render. To deploy your own instance:

1. Create a new Web Service on Render.
2. Link your GitHub repository.
3. Set the environment variables in the Render dashboard.
4. Deploy the application.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is UNLICENSED.
