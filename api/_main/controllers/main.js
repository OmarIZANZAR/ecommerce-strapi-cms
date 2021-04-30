'use strict'

const { sanitizeEntity } = require('strapi-utils')

const stripe = require('stripe')(process.env.STRIPE_SK)

function calculateSubtotal(items){
    let subtotal = 0

    // calculate subtotal:
    items.forEach(item => {
        subtotal += item.product.price * item.quantity
    })

    return subtotal
}

function calculateAmount(checkout){
    let subtotal = 0
    let shipping = 0
    let total = 0

    // calculate subtotal:
    checkout.line_items.forEach(item => {
        subtotal += item.product.price * item.quantity
    })

    shipping = checkout.shipping_method.price

    // calculate total:
    total = subtotal + shipping

    return total * 100
}

function generateReference(){ 
    return "Z-123456" 
}

function estimateDeliveryDate(checkout){
    return 14
}

function getShippingMethods(address){
    return [
        {
            name: "express lines",
            price: 75,
        },
        {
            name: "post",
            price: 30,
        }
    ];
}

function getShippingData(shipping_data){
    let sd = cleanObject(shipping_data)
    return {
        ...sd,
        address: cleanObject(sd.address)
    }
}

function cleanObjects(objects){
    return objects.map(item => {
        delete item.id
        delete item._id
        delete item.__v
        return item
    })
}

function cleanObject(obj){
    delete obj.id
    delete obj._id
    delete obj.__v
    return obj
}

function getLineItems(items){
    return items.map(item => ({
        size: item.size,
        quantity: item.quantity,
        product: item.product.id,
    }) )
}

module.exports = {
    index: async (ctx) => {
        ctx.send("main file")
        console.log(process.env.STRIPE_SK)
    },

    // checkout the cart:
    // POST /checkout/:id
    // BODY { customer_data, shipping_data }
    // => { error, message, data:checkout }
    cartCheckout: async (ctx) => {
        const { id } = ctx.params
        const { customer_data, shipping_data } = ctx.request.body
        console.log("CHECKOUT GUEST OF id=", id)
        
        const guest = await strapi.services.guest.findOne({ id })

        if(!guest) return {
            error: true,
            message: "cart not found"
        }

        const shipping_methods = getShippingMethods(shipping_data.address)

        const subtotal = calculateSubtotal(guest.line_items)

        if(subtotal <= 0) return {
            error: true,
            message: 'no items in cart',
            data: sanitizeEntity(guest, { model: strapi.models.guest })
        }

        const checkout = await strapi.services.checkout.create({
            subtotal: subtotal,
            shipping: 0,
            total: subtotal,
            currency: 'mad',
            line_items: getLineItems(guest.line_items),
            customer: customer_data,
            shipping_data: {
                address: {
                    country: shipping_data.country,
                    state: shipping_data.state,
                    city: shipping_data.city,
                    line1: shipping_data.line1,
                    line2: shipping_data.line2,
                    postal_code: shipping_data.postal_code
                },
                name: customer_data.name,
                phone: customer_data.phone,
            },
            shipping_methods: shipping_methods
        })

        return {
            error: false,
            message: 'checkout created succefuly',
            data: sanitizeEntity(checkout, { model: strapi.models.checkout })
        }
    },

    // adding shipping method to checkout:
    // POST /checkout/pay
    // BODY { checkout_id, selected_shipping_method }
    // => { error, message, data:{ checkout , clientSecret } }
    createPaymentIntent: async (ctx) => {
        const { checkout_id, selected_shipping_method } = ctx.request.body

        const checkout = await strapi.services.checkout.findOne({ id: checkout_id });

        if(!checkout) return {
            error: true,
            message: 'checkout not found',
            data: { checkout_id, selected_shipping_method }
        }

        if(!selected_shipping_method) return {
            error: true,
            message: 'no selected shipping method',
            data: { checkout_id, selected_shipping_method }
        }

        const shipping_method = checkout.shipping_methods.find( item => 
            item.id === selected_shipping_method
        )

        if(!shipping_method) return {
            error: true,
            message: 'selected shipping not available',
            data: { checkout_id, selected_shipping_method }
        }
        
        checkout.shipping_method = shipping_method
        checkout.shipping = checkout.shipping_method.price
        checkout.total = checkout.subtotal + checkout.shipping
        checkout.shipping_data.carrier = checkout.shipping_method.name

        try {
            let paymentIntent = await stripe.paymentIntents.create({
                receipt_email: "omar.oprog@gmail.com",
                amount: calculateAmount(checkout),
                currency: checkout.currency,
                shipping: {
                    address: {
                        country: checkout.shipping_data.address.country,
                        state: checkout.shipping_data.address.state,
                        city: checkout.shipping_data.address.city,
                        postal_code: `${checkout.shipping_data.address.postal_code}`,
                        line1: checkout.shipping_data.address.line1,
                        line2: checkout.shipping_data.address.line2,
                    },
                    name: checkout.shipping_data.name,
                    phone: checkout.shipping_data.phone,
                    carrier: checkout.shipping_data.carrier,
                },
                metadata: {
                    'buyer_email': `${checkout.customer.email}`,
                    'checkout_id': `${checkout.id}`
                },
            })

            checkout.stripe_pi_id = paymentIntent.id

            const updatedCK = await strapi.services.checkout.update(
                { id: checkout.id }, 
                {
                    shipping_method: cleanObject(checkout.shipping_method),
                    shipping: checkout.shipping,
                    total: checkout.total,
                    shipping_data: getShippingData(checkout.shipping_data),
                    stripe_pi_id: checkout.stripe_pi_id,
                }
            )
    
            return {
                error: false,
                message: "payment intent created succefuly",
                data: { 
                    checkout: updatedCK , 
                    clientSecret: paymentIntent.client_secret 
                }
            }
        } catch(err){
            return { 
                error: true,
                message: 'could not create payment intent',
                data: err
            }
        }
    },

    // creating order from checkout:
    // POST /checkout/order 
    // BODY { checkout_id, paymentIntent_id }
    // => { error, message, data:order }
    createOrderFromCheckout: async (ctx) => {
        const { checkout_id, paymentIntent_id } = ctx.request.body

        const checkout = await strapi.services.checkout.findOne({ id: checkout_id });

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent_id);

        // check if checkout and payment intent are the same:
        if(paymentIntent.id != checkout.stripe_pi_id){
            return {
                error: true,
                message: "could not create order",
                data: { checkout_id, paymentIntent_id }
            }
        }

        if(paymentIntent.status !== 'succeeded') return {
            error: true,
            message: "could not create order unpaid status",
            data: { checkout_id, paymentIntent_id }
        }
        
        const order = await strapi.services.order.create({
            reference: generateReference(),
            delivery_date: estimateDeliveryDate(checkout),
            subtotal: checkout.subtotal,
            shipping: checkout.shipping,
            total: checkout.total,
            line_items: getLineItems(checkout.line_items),
            customer: cleanObject(checkout.customer),
            shipping_data: getShippingData(checkout.shipping_data),
            currency: checkout.currency,
            status: "paid",
            process: "accepted",
            stripe_pi_id: paymentIntent.id,
            shipping_method: cleanObject(checkout.shipping_method),
            shipping_methods: cleanObjects(checkout.shipping_methods)
        })

        if(order){
            await strapi.services.checkout.delete({ id: checkout.id })
        }

        return {
            error: false,
            message: "order created succefuly",
            data: order
        }
    }
    
}