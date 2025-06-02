import requests
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Get API keys from environment variables
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Configure Gemini
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize the Gemini model
model = genai.GenerativeModel(model_name="gemini-2.0-flash")

def extract_city_from_query(query):
    prompt = (
        "Extract the city name from the following user input:\n"
        f"\"{query}\"\n\n"
        "Just return the city name, nothing else."
    )
    response = model.generate_content(prompt)
    return response.text.strip()

def get_current_weather(city):
    # Call OpenWeatherMap Current Weather API
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        return None
    
    data = response.json()
    temp = data["main"]["temp"]
    description = data["weather"][0]["description"]
    humidity = data["main"]["humidity"]
    
    weather_summary = (
        f"Current weather in {city}:\n"
        f"Temperature: {temp}°C\n"
        f"Condition: {description}\n"
        f"Humidity: {humidity}%\n"
    )
    return weather_summary

def generate_weather_report(weather_info):
    prompt = (
        "You are a weather assistant. "
        "Based on the following weather information, provide a friendly and informative weather report:\n\n"
        f"{weather_info}"
    )
    
    response = model.generate_content(prompt)
    return response.text

if __name__ == "__main__":
    user_query = input("Ask about weather: ").strip()
    
    city = extract_city_from_query(user_query)
    # print(f"\nDetected city: {city}")
    
    weather_info = get_current_weather(city)
    if not weather_info:
        print("Sorry, couldn't fetch weather data.")
    else:
        final_response = generate_weather_report(weather_info)
        # print("\nGenerated Weather Report:\n")
        print(final_response)
