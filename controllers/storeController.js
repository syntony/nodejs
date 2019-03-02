const mongoose = require('mongoose');
const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
  res.render('index');
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
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