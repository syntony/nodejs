const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

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
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully Created ${store.name} Store! Care to leave review?`);
  res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
  // query DB for a lis of all all stores
  const stores = await Store.find();

  res.render('stores', {
    title: 'Stores',
    stores
  });
}

exports.editStore = async (req, res) => {
  // Find the store given the id
  const store = await Store.findOne({ _id: req.params.id });
  // TODO: Confirm they are the owner of the store
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
  const store = await Store.findOne({ slug: req.params.slug });
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
