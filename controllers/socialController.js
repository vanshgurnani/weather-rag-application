const getTwitterProfile = (username) => {
    try {
        const fakeProfiles = {
            "elonmusk": {
                name: "Elon Musk",
                followers: "180M",
                tweets: "25K",
                bio: "Technoking of Tesla, CEO of SpaceX"
            },
            "jack": {
                name: "Jack Dorsey",
                followers: "6M",
                tweets: "28K",
                bio: "Block Head"
            }
        };

        const data = fakeProfiles[username.toLowerCase()];
        if (!data) {
            return {
                success: false,
                message: `Sorry, we don't have mock data for @${username}.`
            };
        }
        
        return {
            success: true,
            data: {
                name: data.name,
                username: username,
                followers: data.followers,
                tweets: data.tweets,
                bio: data.bio
            },
            message: `${data.name} (@${username}) has ${data.followers} followers and ${data.tweets} tweets. Bio: ${data.bio}`
        };
    } catch (error) {
        console.error('Error fetching Twitter profile:', error);
        return {
            success: false,
            error: error.message,
            message: `Error fetching Twitter data for ${username}.`
        };
    }
};

module.exports = {
    getTwitterProfile
}; 