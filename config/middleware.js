
module.exports = ({ env }) => ({
    settings: {
        cors: {
            origin: [
                env('HOST'), 
                env('CLIENT_URL'),
                env('SERVER_URL'),
                'https://ecommerce-react-strapi-cms.netlify.app',
                'http://localhost:3000'
            ],
        },
    },
});