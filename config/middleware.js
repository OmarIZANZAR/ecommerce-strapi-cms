
module.exports = ({ env }) => ({
    settings: {
        cors: {
            origin: [
                env('HOST'), 
                env('CLIENT_URL'),
                env('SERVER_URL'),
            ],
        },
    },
});