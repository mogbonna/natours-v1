const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const { createBookingCheckout } = require('./bookingController');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  const booking = await Booking.findOne({
    user: res.locals.user,
    tour: tour,
  });
  let comment;
  if (res.locals.user) {
    comment = tour.reviews.some(
      (review) => (review.user.id = res.locals.user.id),
    );
  }

  booked = booking ? true : false;

  // 2) Build template
  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
    booked,
    comment,
  });
});

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Create New Account',
  });
};

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  const { reference } = req.query;

  if (reference) {
    // 1) Verify the transaction with Paystack
    const verificationResponse = await paystack.transaction.verify(reference);

    if (
      verificationResponse.status === true &&
      verificationResponse.data.status === 'success'
    ) {
      // 2) Create the booking in the database
      await createBookingCheckout(verificationResponse.data);

      // 3) Redirect to the clean URL
      return res.redirect('/my-tours');
    } else {
      return res.status(400).send('Payment verification failed');
    }
  }

  // 4) Find all user's bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
