'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async list(ctx) {
        let entities;
        if (ctx.query._q) {
          entities = await strapi.services.product.search(ctx.query);
        } else {
          entities = await strapi.services.product.find(ctx.query);
        }

        let count = entities.length
        let pages_count = Math.ceil(count / 20)
        let data = entities.map(entity => sanitizeEntity(entity, { model: strapi.models.product }))
    
        return {
            meta: {
                count,
                pages_count
            },
            data
        }
    },
};
