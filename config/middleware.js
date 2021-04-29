
module.exports = ({ env }) => ({
    settings: {
        cors: {
            origin: [
                env('HOST'), 
                env('CLIENT_URL'), 
                'https://iz-ecommerce-strapi.herokuapp.com'
            ],
        },
    },
});