'use strict';

const { sanitizeEntity } = require('strapi-utils')
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    async addToCart(ctx){
        const { id } = ctx.params
        const { body } = ctx.request

        const cart = await strapi.services.cart.findOne({ id })

        const new_line = cart.line_items.map(item => ({
            size: item.size,
            quantity: item.quantity,
            product: item.product._id
        }))

        let updatedCart = await strapi.services.cart.update(
            { id },
            {
                line_items: [...new_line, body]
            }
        );
            
        return sanitizeEntity(updatedCart, { model: strapi.models.cart });
    },
};
