'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    // list categories without their products:
    list: async (ctx) => {
        let entities;

        if (ctx.query._q) {
            entities = await strapi.services.category.search(ctx.query);
        } else {
            entities = await strapi.services.category.find(ctx.query);
        }

        entities.forEach(e => {
            e.products = e.products.length
        });
    
        return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.category }));
    },

};
