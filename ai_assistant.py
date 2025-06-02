import requests
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)

# Tool: Get weather info
def get_current_weather(city): 
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        return None
    data = response.json()
    temp = data["main"]["temp"]
    description = data["weather"][0]["description"]
    humidity = data["main"]["humidity"]
    return f"Current weather in {city}: Temperature: {temp}°C, Condition: {description}, Humidity: {humidity}%"

# Tool: Get GitHub profile summary
def get_github_profile(username):
    url = f"https://api.github.com/users/{username}"
    response = requests.get(url)
    if response.status_code != 200:
        return None
    data = response.json()
    return f"{data['name']} (@{data['login']}) has {data['public_repos']} public repos and {data['followers']} followers. Bio: {data.get('bio', 'No bio')}."

# Tool: Mock Twitter profile summary
def get_twitter_profile(username):
    # Hardcoded fake Twitter data
    fake_profiles = {
        "elonmusk": {
            "name": "Elon Musk",
            "followers": "180M",
            "tweets": "25K",
            "bio": "Technoking of Tesla, CEO of SpaceX"
        },
        "jack": {
            "name": "Jack Dorsey",
            "followers": "6M",
            "tweets": "28K",
            "bio": "Block Head"
        }
    }
    data = fake_profiles.get(username.lower())
    if not data:
        return f"Sorry, we don't have mock data for @{username}."
    
    return f"{data['name']} (@{username}) has {data['followers']} followers and {data['tweets']} tweets. Bio: {data['bio']}"

# Tool: Mock Country Info
def get_country_info(country):
    # Hardcoded country data
    countries = {
        "india": {
            "capital": "New Delhi",
            "population": "1.4 billion",
            "language": "Hindi & English",
            "currency": "Indian Rupee (INR)"
        },
        "japan": {
            "capital": "Tokyo",
            "population": "125 million",
            "language": "Japanese",
            "currency": "Japanese Yen (JPY)"
        },
        "france": {
            "capital": "Paris",
            "population": "67 million",
            "language": "French",
            "currency": "Euro (EUR)"
        }
    }

    data = countries.get(country.lower())
    if not data:
        return f"Sorry, no info available for '{country}'."
    
    return (
        f"{country.title()} - Capital: {data['capital']}, Population: {data['population']}, "
        f"Language: {data['language']}, Currency: {data['currency']}"
    )

# Unified Assistant
def ai_assistant(user_query):
    SYSTEM_PROMPT = """You are an intelligent assistant. Based on the user's query, decide what the intent is and respond accordingly.
- If it's a weather-related question, extract the city and say: ACTION:weather:<city>
- If it's about GitHub, extract the username and say: ACTION:github:<username>
- If it's about Twitter, extract the username and say: ACTION:twitter:<username>
- If it's about a country, extract the country name and say: ACTION:country:<country>
- If it's anything else, respond with ACTION:freeform

Only respond with the ACTION: command, nothing else."""

    # Create chat completion with OpenAI
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_query}
        ],
        temperature=0
    )
    
    action_line = response.choices[0].message.content.strip()

    if action_line.startswith("ACTION:weather:"):
        city = action_line.split(":", 2)[2]
        weather_info = get_current_weather(city)
        return weather_info or f"Sorry, couldn't fetch weather data for {city}."

    elif action_line.startswith("ACTION:github:"):
        username = action_line.split(":", 2)[2]
        profile_info = get_github_profile(username)
        return profile_info or f"Sorry, couldn't fetch GitHub data for {username}."

    elif action_line.startswith("ACTION:twitter:"):
        username = action_line.split(":", 2)[2]
        profile_info = get_twitter_profile(username)
        return profile_info or f"Sorry, couldn't fetch Twitter data for {username}."

    elif action_line.startswith("ACTION:country:"):
        country = action_line.split(":", 2)[2]
        return get_country_info(country)

    elif action_line.startswith("ACTION:freeform"):
        # For freeform responses, use OpenAI to generate a response
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Provide a direct and concise response."},
                {"role": "user", "content": user_query}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()

    else:
        return "Sorry, I didn't understand your request."

# Run the assistant
if __name__ == "__main__":
    while True:
        user_query = input("You: ").strip()
        if user_query.lower() in {"exit", "quit", "bye"}:
            print("Goodbye!")
            break
        response = ai_assistant(user_query)
        print("\nAssistant:", response, "\n")
