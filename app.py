import streamlit as st
import google.generativeai as genai
from youtube_transcript_api import YouTubeTranscriptApi
import re
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro')

def format_time(seconds):
    """Format time in seconds to MM:SS"""
    minutes = int(seconds // 60)
    remaining_seconds = int(seconds % 60)
    return f"{minutes}:{str(remaining_seconds).zfill(2)}"

def extract_video_id(url):
    """Extract video ID from YouTube URL"""
    pattern = r'(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.search(pattern, url)
    return match.group(1) if match else None

def get_transcript(video_id):
    """Get transcript for a YouTube video"""
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Try to get English transcript first
        try:
            transcript = transcript_list.find_transcript(['en'])
            transcript_data = transcript.fetch()
        except:
            # If English fails, get auto-generated transcript
            transcript = transcript_list.find_generated_transcript(['en'])
            transcript_data = transcript.fetch()
        
        # Format transcript with timestamps
        formatted_transcript = []
        for entry in transcript_data:
            timestamp = format_time(entry['start'])
            formatted_transcript.append(f"[{timestamp}] {entry['text']}")
        
        return '\n'.join(formatted_transcript)
    
    except Exception as e:
        st.error(f"Error fetching transcript: {str(e)}")
        return None

def summarize_text(text):
    """Summarize text using Gemini"""
    try:
        # Remove timestamps for the summary
        clean_text = re.sub(r'\[\d+:\d+\] ', '', text)
        prompt = f"""Please provide a concise summary of this YouTube video transcript, 
        highlighting the main points and key takeaways:

        {clean_text}"""
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        st.error(f"Error generating summary: {str(e)}")
        return None

def main():
    st.set_page_config(
        page_title="YouTube Video Summarizer",
        page_icon="🎥",
        layout="wide"
    )
    
    st.title("🎥 YouTube Video Summarizer")
    st.write("Enter a YouTube video URL to get a summary of its content!")

    # Input for YouTube URL
    url = st.text_input("YouTube Video URL")

    if url:
        video_id = extract_video_id(url)
        
        if not video_id:
            st.error("Invalid YouTube URL. Please check the URL and try again.")
            return

        with st.spinner("Fetching transcript..."):
            transcript = get_transcript(video_id)
            
            if transcript:
                # Display video
                st.video(f"https://www.youtube.com/watch?v={video_id}")
                
                # Create tabs for transcript and summary
                tab1, tab2 = st.tabs(["📝 Transcript", "📋 Summary"])
                
                with tab1:
                    st.markdown("### Full Transcript")
                    st.text_area("", transcript, height=400)
                
                with tab2:
                    st.markdown("### Video Summary")
                    with st.spinner("Generating summary..."):
                        summary = summarize_text(transcript)
                        if summary:
                            st.markdown(summary)
                        else:
                            st.error("Could not generate summary. Please try again.")
            else:
                st.error("""Could not fetch video transcript. This could be because:
                1. The video has no captions
                2. Captions are disabled by the creator
                3. The video is private or age-restricted""")

if __name__ == "__main__":
    main() 