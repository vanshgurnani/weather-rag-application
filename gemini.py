import google.generativeai as genai

# Configure with your API key (replace with your actual API key)
genai.configure(api_key="API_KEY")  # Use a valid key from your Google Cloud project

# Use the correct model (make sure the model name is available for your project)
model = genai.GenerativeModel(model_name="gemini-2.0-flash")

# Get prompt input from the user
user_prompt = input("Enter your prompt/question: ")

# Generate content using the user's prompt
response = model.generate_content(user_prompt)

# Print the generated text
print(response.text)
