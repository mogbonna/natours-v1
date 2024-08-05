const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const crypto = require('crypto');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create a unique reference for the transaction
  const reference = `${req.params.tourId}-${Date.now()}`;

  // 3) Define the callback URL
  const callbackUrl = `${req.protocol}://${req.get('host')}/my-tours`;
  console.log(callbackUrl);

  // 4) Initialize Paystack transaction
  const response = await paystack.transaction.initialize({
    email: req.user.email,
    amount: tour.price * 100, // Amount in kobo
    // currency: 'NGN',
    reference: reference,
    callback_url: callbackUrl,
    metadata: {
      custom_fields: [
        {
          display_name: 'Tour Name',
          variable_name: 'tour_name',
          value: tour.name,
        },
        {
          display_name: 'Tour Description',
          variable_name: 'tour_description',
          value: tour.summary,
        },
        {
          display_name: 'Tour Image',
          variable_name: 'tour_image',
          value: `https://www.natours.dev/img/tours/${tour.imageCover}`,
        },
      ],
    },
  });

  // 5) Create session as response
  res.status(200).json({
    status: 'success',
    authorization_url: response.data.authorization_url,
    access_code: response.data.access_code,
    reference: response.data.reference,
  });
});

const createBookingCheckout = async (data) => {
  try {
    // Extract relevant information from Paystack data
    const { reference, amount, customer } = data;

    // Assuming you have a Booking model
    const booking = await Booking.create({
      reference: reference,
      amount: amount / 100, // Paystack amount is in kobo, convert to naira
      customer: customer.email,
      // Add other relevant fields
    });

    console.log('Booking created:', booking);
  } catch (error) {
    console.error('Error creating booking:', error);
  }
};

exports.webhookCheckout = (req, res, next) => {
  // Retrieve the request's body
  const body = req.body;

  // Validate event
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = body;

  // Handle the event
  switch (event.event) {
    case 'charge.success':
      createBookingCheckout(event.data);
      break;
    default:
      console.log(`Unhandled event type: ${event.event}`);
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).json({ received: true });
};

exports.checkIfBooked = catchAsync(async (req, res, next) => {
  // To check if booked was bought by user who wants to review it
  const booking = await Booking.find({
    user: req.user.id,
    tour: req.body.tour,
  });
  if (booking.length === 0)
    return next(
      new AppError(
        'You need to purchase this tour in order to leave a review.',
        401,
      ),
    );
  next();
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
