'use strict';

const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    // ADD NEW ITEM:
    // POST /guests/additem/:id
    // BODY { product, size, quantity }
    // => { error, message, data }
    async addItem(ctx){
        const { id } = ctx.params
        const body = ctx.request.body
        console.log("ADD ITEM IN GUEST OF id=", id)

        let guest = await strapi.services.guest.findOne({ id })

        if(!guest){
            guest = await strapi.services.guest.create()
            return {
                error: true,
                message: "cart not found, a new one created",
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
    // PUT /guests/deleteitem/:id
    // BODY { item_id }
    // => { error, message, data }
    async deleteItem(ctx){
        const { id } = ctx.params
        const { item_id } = ctx.request.body
        console.log("DELETE ITEM FROM GUEST OF id=", id, " ", item_id)

        const guest = await strapi.services.guest.findOne({ id })

        if(!guest){
            guest = await strapi.services.guest.create()
            return {
                error: true,
                message: "cart not found, a new one created",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }
        }

        const item = guest.line_items.find(item => item.id === item_id)

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
    // PUT /guests/updateitem/:id
    // BODY { item_id, quantity }
    // => { error, message, data }
    async updateItem(ctx){
        const { id } = ctx.params
        const { item_id , quantity } = ctx.request.body
        console.log("UPDATE ITEM IN GUEST OF id=", id)

        const guest = await strapi.services.guest.findOne({ id })

        if(!guest){
            guest = await strapi.services.guest.create()
            return {
                error: true,
                message: "cart not found, a new one created",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }
        }

        let item = guest.line_items.find(item => {
            if(item !== null) return item.id === item_id
        })

        if(!item) return {
            error: true,
            message: "item not found",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        const product = await strapi.services.product.findOne({ id: item.product.id })

        if(!product) return {
            error: true,
            message: "product of the item not found",
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

            if( newQuantity <= 0 ){
                new_line_items = guest.line_items
                    .filter(item => item.id !== item_id)
                    .map(item => ({
                        size: item.size,
                        quantity: item.quantity,
                        product: item.product.id
                    }))

                subtotal -= item.quantity * item.product.price;
            } else {
                guest.line_items.forEach(item => {
                    if(item !== null && item.id === item_id){
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
    // GET /guests/initiate
    // => { error, message, data }
    async initiateCart(ctx){
        let guest = await strapi.services.guest.create()
            
        return {
            error: false,
            message: "cart initiated succefuly",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        };
    },

    // RETRIEVE THE CART:
    // GET /guests/retrieve/:id
    // => { error, message, data }
    async retrieveCart(ctx){
        const { id } = ctx.params
        console.log("RETRIEVE GUEST OF id=", id)

        let guest = await strapi.services.guest.findOne({ id });

        if(!guest){
            guest = await strapi.services.guest.create()
            return {
                error: true,
                message: "cart not found, a new one created",
                data: sanitizeEntity(guest, { model: strapi.models.guest })
            }
        }
            
        return {
            error: false,
            message: "cart retrieved succefuly",
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        };
    },

    // EMPTY CART:
    // PUT /guests/empty/:id
    // => { error, message, data }
    async emptyCart(ctx){
        const { id } = ctx.params
        console.log("EMPTY GUEST OF id=", id)

        let updatedGuest = await strapi.services.guest.update(
            { id },
            { 
                subtotal: 0,
                shipping: 0,
                total: 0,
                line_items: []
            }
        );
            
        return {
            error: false,
            message: "cart updated to empty",
            data: sanitizeEntity(updatedGuest, { model: strapi.models.guest })
        };
    }
};
