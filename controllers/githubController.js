const axios = require('axios');

const getGithubProfile = async (username) => {
    try {
        const url = `https://api.github.com/users/${username}`;
        const response = await axios.get(url);
        const data = response.data;

        return {
            success: true,
            data: {
                name: data.name,
                username: data.login,
                repos: data.public_repos,
                followers: data.followers,
                bio: data.bio || 'No bio'
            },
            message: `${data.name} (@${data.login}) has ${data.public_repos} public repos and ${data.followers} followers. Bio: ${data.bio || 'No bio'}.`
        };
    } catch (error) {
        console.error('Error fetching GitHub profile:', error);
        return {
            success: false,
            error: error.message,
            message: `Sorry, couldn't fetch GitHub data for ${username}.`
        };
    }
};

module.exports = {
    getGithubProfile
}; 