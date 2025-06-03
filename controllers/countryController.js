const getCountryInfo = (country) => {
    try {
        const countries = {
            "india": {
                capital: "New Delhi",
                population: "1.4 billion",
                language: "Hindi & English",
                currency: "Indian Rupee (INR)"
            },
            "japan": {
                capital: "Tokyo",
                population: "125 million",
                language: "Japanese",
                currency: "Japanese Yen (JPY)"
            },
            "france": {
                capital: "Paris",
                population: "67 million",
                language: "French",
                currency: "Euro (EUR)"
            }
        };

        const data = countries[country.toLowerCase()];
        if (!data) {
            return {
                success: false,
                message: `Sorry, no info available for '${country}'.`
            };
        }
        
        return {
            success: true,
            data: {
                name: country.charAt(0).toUpperCase() + country.slice(1),
                ...data
            },
            message: `${country.charAt(0).toUpperCase() + country.slice(1)} - Capital: ${data.capital}, Population: ${data.population}, Language: ${data.language}, Currency: ${data.currency}`
        };
    } catch (error) {
        console.error('Error fetching country info:', error);
        return {
            success: false,
            error: error.message,
            message: `Error fetching information for ${country}.`
        };
    }
};

module.exports = {
    getCountryInfo
}; 