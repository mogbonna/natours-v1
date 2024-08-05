const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const crypto = require('crypto');
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create a unique reference for the transaction
  const reference = `${req.params.tourId}-${Date.now()}`;

  // 3) Define the callback URL with the reference parameter
  const callbackUrl = `${req.protocol}://${req.get('host')}/my-tours`;

  // 4) Initialize Paystack transaction
  const response = await paystack.transaction.initialize({
    email: req.user.email,
    amount: tour.price * 100, // Amount in kobo
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
          value: `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
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
    const { reference, amount, customer } = data;

    const tourId = reference.split('-')[0];
    const user = await User.findOne({ email: customer.email });
    const tour = await Tour.findById(tourId);

    const booking = await Booking.create({
      tour: tourId,
      user: user._id,
      price: amount / 100, // Paystack amount is in kobo, convert to naira
    });

    console.log('Booking created:', booking);
  } catch (error) {
    console.error('Error creating booking:', error);
  }
};

exports.createBookingCheckout = createBookingCheckout;

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
      createBookingCheckout(event.data.reference);
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

  if (booking.length === 0) {
    return next(
      new AppError(
        'You need to purchase this tour in order to leave a review.',
        401,
      ),
    );
  }
  next();
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
