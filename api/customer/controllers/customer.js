'use strict';

const { sanitizeEntity } = require('strapi-utils')

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async create(ctx) {
        let entity;
        
        let cart = await strapi.services.cart.create({
            subtotal: 0,
            shipping: 0,
            total: 0,
            line_items: []
        })
        
        entity = await strapi.services.customer.create({
            ...ctx.request.body,
            cart: cart._id
        });

        return sanitizeEntity(entity, { model: strapi.models.customer });
    },
};
