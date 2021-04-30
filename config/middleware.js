
module.exports = ({ env }) => ({
    settings: {
        cors: {
            origin: [
                env('HOST'), 
                env('CLIENT_URL'),
                'http://localhost:3000',
                'http://localhost:1337',
                'https://iz-ecommerce-strapi.herokuapp.com',
                'https://iz-ecommerce-strapi.netlify.app',
            ],
        },
    },
});