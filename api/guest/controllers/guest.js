'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    // ADD NEW ITEM:
    // POST /guests/item (Cookie: guest_id) {size, quantity, product}
    async addItem(ctx){
        const guest_id = ctx.cookies.get('guest_id', { signed: false })
        const body = ctx.request.body

        // CHECKING:
        let guest = await strapi.services.guest.findOne({ id:guest_id })

        if(!guest){
            guest = await strapi.services.guest.create()
            ctx.cookies.set('guest_id', guest.id, {overwrite: true})
            return {
                error: true,
                message: "cart not found",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }
        }

        const product = await strapi.services.product.findOne({ id: body.product })

        if(!product) return {
            error: true,
            message: "product not found",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        let product_size = product.sizes.find(size => size.value === body.size)
        
        if(!product_size) return {
            error: true,
            message: "the product size requested is not available",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        if( body.quantity > product_size.quantity ) return {
            error: true,
            message: "the quantity of the product size requested is not available",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        // CHECHING SUCCESS --> ADDING PRODUCT TO CART:
        let subtotal = guest.subtotal;
        let shipping = guest.shipping;
        let total = guest.total;
        let new_line_items = guest.line_items.map(item => {
            if(item !== null ) return {
                size: item.size,
                quantity: item.quantity,
                product: item.product.id
            }
        })

        const item_in_line = new_line_items.find(item => item.product === body.product)

        if( item_in_line && item_in_line.size == body.size ){
            const newQuantity = body.quantity + item_in_line.quantity

            if(newQuantity > product_size.quantity) return {
                error: true,
                message: "the quantity of the product size requested is not available",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }

            subtotal += body.quantity * product.price;
            total = shipping + subtotal;
            new_line_items.forEach(item => {
                if(item.product === body.product ){
                    item.quantity = newQuantity
                }
            })

        } else {
            subtotal += body.quantity * product.price;
            total = shipping + subtotal;
            new_line_items = [...new_line_items, body]
        }
        
        const updatedGuest = await strapi.services.guest.update(
            { id:guest.id },
            { 
                subtotal,
                shipping,
                total,
                line_items: [...new_line_items] 
            }
        );
            
        return {
            error: false,
            message: "product added to cart succefuly",
            data: sanitizeEntity(updatedGuest, { model: strapi.models.guest })
        };
    },

    // DELETE AN ITEM:
    // DELETE /guests/item/:id (Cookie: guest_id)
    async deleteItem(ctx){
        const guest_id = ctx.cookies.get('guest_id', { signed: false })
        const { id } = ctx.params

        const guest = await strapi.services.guest.findOne({ id:guest_id })

        if(!guest) return {
            error: true,
            message: "cart not found"
        }

        const item = guest.line_items.find(item => item.id === id)

        if(!item) return {
            error: true,
            message: "item not found",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        let new_line_items = guest.line_items
            .filter(item => item.id !== id)
            .map(item => ({
                size: item.size,
                quantity: item.quantity,
                product: item.product.id
            }))

        let subtotal = guest.subtotal - item.quantity * item.product.price;
        let shipping = guest.shipping;
        let total = shipping + subtotal;

        let updatedGuest = await strapi.services.guest.update(
            { id:guest.id },
            {
                subtotal,
                shipping,
                total,
                line_items: [...new_line_items] 
            }
        );
            
        return {
            error: false,
            message: "item deleted succefuly",
            data: sanitizeEntity(updatedGuest, { model: strapi.models.guest })
        };
    },

    // UPDATE AN ITEM:
    // PUT /guests/item/:id (Cookie: guest_id) { quantity } 
    async updateItem(ctx){
        const guest_id = ctx.cookies.get('guest_id', { signed: false })
        const { id } = ctx.params
        const { quantity } = ctx.request.body

        const guest = await strapi.services.guest.findOne({ id:guest_id })

        if(!guest) return {
            error: true,
            message: "cart not found"
        }

        let item = guest.line_items.find(item => {
            if(item !== null) return item.id === id
        })

        if(!item) return {
            error: true,
            message: "item not found",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        const product = await strapi.services.product.findOne({ id:item.product.id })

        if(!product) return {
            error: true,
            message: "product not found",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        let subtotal = guest.subtotal;
        let shipping = guest.shipping;
        let total = guest.total;
        let new_line_items = guest.line_items.map(item => {
            if(item !== null ) return {
                size: item.size,
                quantity: item.quantity,
                product: item.product.id
            }
        });
        
        if( quantity ){
            const newQuantity = item.quantity + quantity

            const product_size_quantity = product.sizes.find(s => s.value === item.size).quantity

            if(!product_size_quantity) return {
                error: true,
                message: "item size not found",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }

            if( newQuantity > product_size_quantity) return {
                error: true,
                message: "item requested quantity is not available",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }

            if( newQuantity == 0 ){
                new_line_items = guest.line_items
                    .filter(item => item.id !== id)
                    .map(item => ({
                        size: item.size,
                        quantity: item.quantity,
                        product: item.product.id
                    }))

                subtotal -= item.quantity * item.product.price;
            } else {
                guest.line_items.forEach(item => {
                    if(item !== null && item.id === id){
                        item.quantity = newQuantity
                    }
                })
    
                subtotal = 0
                guest.line_items.forEach(item => {
                    if(item !== null)
                        subtotal += item.quantity * item.product.price
                })
    
                new_line_items = guest.line_items.map(item => {
                    if(item !== null ) return {
                        size: item.size,
                        quantity: item.quantity,
                        product: item.product.id
                    }
                });
            }

            total = shipping + subtotal
        }

        let updatedGuest = await strapi.services.guest.update(
            { id: guest.id },
            { 
                subtotal,
                shipping,
                total,
                line_items: [...new_line_items]
            }
        );
            
        return {
            error: false,
            message: "quantity updated succefuly",
            data: sanitizeEntity(updatedGuest, { model: strapi.models.guest })
        };
    },

    // RETRIEVE THE CART:
    // GET /guests/retrieve (Cookie: guest_id)
    async retrieveCart(ctx){
        const guest_id = ctx.cookies.get('guest_id', { signed: false })

        let guest;

        if(!guest_id){
            guest = await strapi.services.guest.create()
            return {
                error: true,
                message: "cart not found",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }
        }

        guest = await strapi.services.guest.findOne({ id: guest_id });

        if(!guest){
            guest = await strapi.services.guest.create()
            ctx.cookies.set('guest_id', guest.id, { overwrite: true })
            return {
                error: true,
                message: "cart not found",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }
        }
            
        return {
            error: false,
            message: "cart retreived succefuly",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        };
    },

    // EMPTY CART:
    // PUT /guests/empty (Cookie: guest_id)
    async emptyCart(ctx){
        const guest_id = ctx.cookies.get('guest_id', { signed: false })

        let updatedGuest = await strapi.services.guest.update(
            { id: guest_id },
            { 
                subtotal: 0,
                shipping: 0,
                total: 0,
                line_items: []
            }
        );

        if(!updatedGuest){
            updatedGuest = await strapi.services.guest.create()
            ctx.cookies.set('guest_id', updatedGuest.id, {overwrite: true})
            return {
                error: true,
                message: "cart not found",
                data: sanitizeEntity(updatedGuest, { model: strapi.models.guest })
            }
        }
            
        return {
            error: false,
            message: "cart empty",
            data: sanitizeEntity(updatedGuest, { model: strapi.models.guest })
        };
    }
};
