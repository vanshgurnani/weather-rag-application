# Multi-Purpose Assistant Application

This Node.js application includes multiple tools:
1. Weather & Todo Assistant
2. YouTube Video Summarizer
3. OpenAI Integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```env
# Required for Weather Assistant
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Required for AI features (Todo Assistant & YouTube Summarizer)
GOOGLE_API_KEY=your_google_api_key_here

# Required for OpenAI features (optional)
OPENAI_API_KEY=your_openai_api_key_here

# Required for Todo features
MONGODB_URI=your_mongodb_connection_string
```

## Available Commands

### 1. Weather & Todo Assistant
```bash
npm start
```
This command runs the main assistant that can:
- Get weather information for any city
- Manage todos (create, update, delete, search)
- Look up GitHub profiles
- Check Twitter profiles
- Get country information

### 2. YouTube Video Summarizer
```bash
npm run test-youtube
```
This command runs the YouTube video summarizer that can:
- Extract transcripts from YouTube videos
- Show timestamped transcripts
- Generate AI summaries of video content
- Support multiple languages (when available)

### 3. OpenAI Integration
```bash
npm run test-openai
```
This command runs the OpenAI-powered version that provides:
- Alternative AI processing
- OpenAI-specific features
- Different summarization approach

## Features Breakdown

### Weather & Todo Assistant (`npm start`)
- Create todos with priorities (high/medium/low)
- Search and filter todos by priority or text
- Get weather updates for any city
- GitHub profile information
- Twitter profile data
- Country information

### YouTube Summarizer (`npm run test-youtube`)
- Input: YouTube video URL
- Output: 
  - Full transcript with timestamps
  - AI-generated summary
  - Available caption languages
- Supports both manual and auto-generated captions

### OpenAI Version (`npm run test-openai`)
- Alternative AI processing using OpenAI
- Different conversation style
- OpenAI-specific features

## Usage Examples

### Weather & Todo Assistant
```bash
npm start
# Then try commands like:
# "what's the weather in London"
# "add high priority todo buy groceries"
# "show all medium priority tasks"
```

### YouTube Summarizer
```bash
npm run test-youtube
# Then paste a YouTube URL like:
# https://www.youtube.com/watch?v=example
```

### OpenAI Version
```bash
npm run test-openai
# Similar to the main assistant but uses OpenAI
```

## Error Handling

The application includes robust error handling for:
- Database connection issues
- API unavailability
- Invalid inputs
- Missing transcripts
- Network problems

## Dependencies

- @google/generative-ai: For AI processing
- axios: For HTTP requests
- dotenv: For environment variables
- mongoose: For database operations
- youtube-transcript: For YouTube transcript fetching

## Contributing

Feel free to submit issues and enhancement requests! 