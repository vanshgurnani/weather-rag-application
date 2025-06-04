const readline = require('readline');
const { YoutubeTranscript } = require('youtube-transcript');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
require('dotenv').config();

// Configure Gemini
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to extract video ID from YouTube URL
function extractVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : false;
}

// Function to check if video exists and is accessible
async function checkVideoAccessibility(videoId) {
    try {
        const response = await axios.get(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
        console.log('Video title:', response.data.title);
        return true;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error('Video not found or not accessible. Please check if:');
            console.error('1. The video exists');
            console.error('2. The video is not private');
            console.error('3. The video is not age-restricted');
        } else {
            console.error('Error checking video:', error.message);
        }
        return false;
    }
}

// Function to format time in seconds to MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Function to get transcript
async function getTranscript(videoId) {
    try {
        console.log('Fetching transcript for video ID:', videoId);
        
        // First, try to get list of available languages
        try {
            const transcriptList = await YoutubeTranscript.listTranscripts(videoId);
            console.log('\nAvailable transcript languages:');
            transcriptList.forEach(transcript => {
                console.log(`- ${transcript.language} (${transcript.isGenerated ? 'Auto-generated' : 'Manual'})`);
            });
        } catch (e) {
            console.log('Could not fetch list of available transcripts');
        }

        // Try to fetch English transcript first
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
            if (transcript && transcript.length > 0) {
                console.log('Successfully fetched English transcript');
                // Format transcript with timestamps
                return transcript.map(item => 
                    `[${formatTime(item.offset/1000)}] ${item.text}`
                ).join('\n');
            }
        } catch (e) {
            console.log('Could not fetch English transcript, trying auto-generated...');
        }

        // If English fails, try auto-generated transcript
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        
        if (!transcript || transcript.length === 0) {
            console.error('\nNo transcript available. This could be because:');
            console.error('1. The video has no captions');
            console.error('2. Captions are disabled by the creator');
            console.error('3. The video is private or age-restricted');
            return null;
        }
        
        console.log('Successfully fetched transcript');
        // Format transcript with timestamps
        return transcript.map(item => 
            `[${formatTime(item.offset/1000)}] ${item.text}`
        ).join('\n');
    } catch (error) {
        console.error('\nError details:', {
            message: error.message,
            name: error.name
        });
        
        if (error.message.includes('Could not get the transcript')) {
            console.error('\nPossible reasons:');
            console.error('1. The video might not have captions enabled');
            console.error('2. The video might be private or age-restricted');
            console.error('3. The video ID might be incorrect');
            console.error('4. YouTube API might be temporarily unavailable');
        }
        
        return null;
    }
}

// Function to summarize text using Gemini
async function summarizeText(text) {
    try {
        // Remove timestamps for the summary
        const cleanText = text.replace(/\[\d+:\d+\] /g, '');
        const prompt = `Please provide a concise summary of this YouTube video transcript, highlighting the main points and key takeaways:\n\n${cleanText}`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating summary:', error);
        return null;
    }
}

// Main function
async function main() {
    try {
        rl.question('Enter YouTube video URL: ', async (url) => {
            console.log('\nProcessing video...');
            
            // Extract video ID
            const videoId = extractVideoId(url);
            if (!videoId) {
                console.error('Invalid YouTube URL');
                rl.close();
                return;
            }

            // Check if video is accessible
            const isAccessible = await checkVideoAccessibility(videoId);
            if (!isAccessible) {
                rl.close();
                return;
            }

            // Get transcript
            const transcript = await getTranscript(videoId);
            if (!transcript) {
                console.error('Could not fetch video transcript');
                rl.close();
                return;
            }

            // Display the full transcript
            console.log('\n=== Full Transcript ===\n');
            console.log(transcript);
            console.log('\n=====================\n');

            console.log('\nGenerating summary...');
            
            // Generate summary
            const summary = await summarizeText(transcript);
            if (!summary) {
                console.error('Could not generate summary');
                rl.close();
                return;
            }

            console.log('\n=== Video Summary ===\n');
            console.log(summary);
            console.log('\n===================\n');

            rl.question('Would you like to summarize another video? (y/n): ', (answer) => {
                if (answer.toLowerCase() === 'y') {
                    main();
                } else {
                    rl.close();
                }
            });
        });
    } catch (error) {
        console.error('An error occurred:', error);
        rl.close();
    }
}

// Start the application
console.log('Welcome to YouTube Video Summarizer!\n');
main(); 