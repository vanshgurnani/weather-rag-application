import os
from dotenv import load_dotenv
import google.generativeai as genai
from rich.console import Console
from rich.table import Table

# Load environment variables
load_dotenv()

# Initialize the console for pretty printing
console = Console()

def list_available_models():
    """List all available Google AI models"""
    try:
        # Configure the API key
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            console.print("[red]Error: GOOGLE_API_KEY not found in environment variables[/red]")
            return

        genai.configure(api_key=api_key)

        # Get all available models
        models = genai.list_models()

        # Create a simple table
        table = Table(title="Available Google AI Models")
        table.add_column("Model Name", style="cyan")
        table.add_column("Display Name", style="green")

        # Group models by type
        model_groups = {
            "Gemini": [],
            "Gemma": [],
            "Embedding": [],
            "Other": []
        }

        for model in models:
            name = model.name
            display_name = model.display_name or "N/A"
            
            # Categorize models
            if "gemini" in name.lower():
                model_groups["Gemini"].append((name, display_name))
            elif "gemma" in name.lower():
                model_groups["Gemma"].append((name, display_name))
            elif "embed" in name.lower():
                model_groups["Embedding"].append((name, display_name))
            else:
                model_groups["Other"].append((name, display_name))

        # Add models to table by group
        for group_name, group_models in model_groups.items():
            if group_models:
                table.add_row(f"[bold yellow]{group_name} Models:[/bold yellow]", "")
                for name, display_name in sorted(group_models):
                    table.add_row(name, display_name)
                table.add_row("", "")  # Empty row for spacing

        # Print the table
        console.print(table)

        # Print total count
        total_models = sum(len(models) for models in model_groups.values())
        console.print(f"\n[green]Total models available: {total_models}[/green]")

    except Exception as e:
        console.print(f"[red]Error listing models: {str(e)}[/red]")

if __name__ == "__main__":
    console.print("\n[bold blue]Fetching available Google AI models...[/bold blue]\n")
    list_available_models() 