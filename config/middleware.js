
module.exports = ({ env }) => ({
    settings: {
        cors: {
            origin: [
                env('HOST'), 
                env('CLIENT_URL'),
                env('SERVER_URL'),
                'http://localhost:3000',
                'http://localhost:1337',
                'https://ecommerce-strapi-cms.onrender.com',
                'https://iz-ecommerce-strapi.netlify.app',
                '0.0.0.0'
            ],
        },
    },
});