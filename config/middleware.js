
module.exports = ({ env }) => ({
    settings: {
        cors: {
            origin: ['http://localhost:1337', env('HOST'), env('CLIENT_URL')],
        },
    },
});