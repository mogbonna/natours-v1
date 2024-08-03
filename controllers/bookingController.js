const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
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
  const callbackUrl = `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`;
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

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

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
