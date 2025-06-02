import requests

# Set your OpenWeather API key
OPENWEATHER_API_KEY = "API_KEY"

def get_current_weather(city):
    # Call OpenWeatherMap Current Weather API
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        return "Sorry, couldn't fetch weather data."
    
    data = response.json()
    temp = data["main"]["temp"]

    return (
        f"Current weather in {city}:\n"
        f"Temperature: {temp}°C\n"
    )

if __name__ == "__main__":
    city = input("Enter city name: ")
    print(get_current_weather(city))
