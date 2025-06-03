# Weather RAG Application CLI

This is a Node.js command-line application that provides an AI assistant capable of handling weather information, GitHub profiles, Twitter profiles, and country information queries.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
OPENWEATHER_API_KEY=your_openweather_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

3. Start the application:
```bash
npm start
```

## Usage

Once you start the application, you can interact with it through the command line. Simply type your query and press Enter.

Example queries:
- "What's the weather in London?"
- "Tell me about the GitHub user torvalds"
- "Show me Elon Musk's Twitter profile"
- "Tell me about India"
- Or ask any other question!

To exit the program, type 'exit', 'quit', or 'bye'.

## Features

- Weather information for any city
- GitHub profile information
- Mock Twitter profile data
- Basic country information
- AI-powered response generation using Google's Gemini model

## Error Handling

The application will display appropriate error messages if:
- There's an error processing your request
- The external APIs are unavailable
- The AI model encounters an error 