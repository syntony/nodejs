const mongoose = require('mongoose');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const Store = mongoose.model('Store');
const User = mongoose.model('User');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter: function(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'Thats filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no fil to resize
  if (!req.file) {
    next(); //skip to next middleware
    return;
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;

  // now we resize
  const photo = await jimp.read(req.file.buffer);

  await photo.resize(800, jimp.AUTO);

  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our filesystem, keep going!
  next();
}

exports.createStore = async (req, res) => {
  req.body.author = req.user && req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully Created ${store.name} Store! Care to leave review?`);
  res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = (page * limit) - limit;
  // query DB for a lis of all all stores
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' })
    .populate('reviews');

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);

  if (!stores.length && skip) {
    req.flash('info', `Hey! You asked for page ${page} but that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }

  res.render('stores', {
    title: 'Stores',
    stores,
    page,
    pages,
    count
  });
}

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.editStore = async (req, res) => {
  // Find the store given the id
  const store = await Store.findOne({ _id: req.params.id });
  // Confirm they are the owner of the store
  confirmOwner(store, req.user);
  // Render out the edit form
  res.render('editStore', {
    title: 'Edit Store',
    store
  })
}

exports.updateStore = async (req, res) => {
  // set the location data to be point
  req.body.location.type = 'Point';
  // find and update store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new store instead the old one
    runValidators: true,
  }).exec();
  req.flash('success', `Successfully Updated ${store.name} <a href="/store/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
  // say user it's updated and redirect
}

exports.getStoreBySlug = async(req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug })
    .populate('author reviews');
  if (!store) return next();
  res.render('store', { store, title: store.name })
}

exports.getStoreByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };

  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });

  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', { tags, title: 'Tags', tag, stores });
}

exports.searchStore = async (req, res) => {
  const stores = await Store
    // find stores that match
    .find({
      $text: {
        $search: req.query.q
      }
    }, {
      score: { $meta: 'textScore' }
    })
    // sort them
    .sort({
      score: { $meta: 'textScore' }
    })
    // limit to only 5 results
    .limit(5);

  // return json
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
}

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );
  res.json(user);
}

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });

  res.render('stores', {
    title: 'Hearted Stores',
    stores
  });
}

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();

  res.render('topStores', { stores, title: `★ Top Stores!` });
}
