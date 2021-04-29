
//,
        // 
        // {
        //     "method": "POST",
        //     "path": "/checkout/shipping/:id",
        //     "handler": "main.provideShippingAddress"
        // },
        // {
        //     "method": "POST",
        //     "path": "/checkout/capture/:id",
        //     "handler": "main.payOrder"
        // }



        const checkout = await stripe.services.checkout.create({
            subtotal: calculateAmount(cart.line_items, 0),
            currency: 'mad',
            line_items: cart.line_items,
            customer: customer,
            shipping_data: {
                address: address, 
                name: customer.name,
                phone: customer.phone,  
            },
            shipping_methods: shipping_methods
        })

        if(!checkout.customer.customer){
            paymentIntent = await stripe.paymentIntents.create({
                recipt_email: "omar.oprog@gmail.com",
                amount: calculateAmount(cart.line_items, shipping_method.price),
                currency: 'mad',
                shipping: {
                    address: shipping.address,
                    name: shipping.name,
                    phone: shipping.phone,
                    carrier: shipping_method.name,
                },
                metadata: {
                    buyer_email: customer.email,
                },
            })
        }else{
            const paymentMethods = await stripe.paymentMethods.list({
                customer: checkout.customer.customer._id,
                type: 'card'
            });

            paymentIntent = await stripe.paymentIntents.create({
                recipt_email: "omar.oprog@gmail.com",
                amount: calculateAmount(checkout, selected_shipping_method),
                currency: 'mad',
                customer: checkout.customer.customer._id,
                payment_method: paymentMethods[0].id,
                shipping: {
                    address: shipping.address,
                    name: shipping.recipient_name,
                    phone: shipping.recipient_phone,
                    carrier: shipping_method.name ,
                },
                metadata: {
                    buyer_id: customer.id,
                    buyer_name: customer.name,
                    buyer_phone: customer.phone,
                    buyer_email: customer.email,
                },
            })
        }


// ./config/database.js
module.exports = ({ env }) => ({
    defaultConnection: 'default',
    connections: {
      default: {
        connector: 'mongoose',
        settings: {
          uri: env('DATABASE_URI'),
          srv: env.bool('DATABASE_SRV', true),
          port: env.int('DATABASE_PORT', 27017),
          database: env('DATABASE_NAME'),
          // host: env('DATABASE_HOST', '127.0.0.1'),
          // srv: env.bool('DATABASE_SRV', false),
          // port: env.int('DATABASE_PORT', 27017),
          // database: env('DATABASE_NAME', 'ecommerce-strapi'),
          // username: env('DATABASE_USERNAME', null),
          // password: env('DATABASE_PASSWORD', null),
        },
        options: {
          authenticationDatabase: env('AUTHENTICATION_DATABASE', null),
          ssl: env.bool('DATABASE_SSL', false),
        },
      },
    },
  });