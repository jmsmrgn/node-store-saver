const mongoose = require('mongoose')
const Store = mongoose.model('Store')
const User = mongoose.model('User')
const jimp = require('jimp')
const uuid = require('uuid')
const multer = require('multer')

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/')
    if (isPhoto) {
      next(null, true)
    } else {
      next({ message: 'That filetype isn\'t allowed!'}, false)
    }
  }
}

exports.homePage = (req, res) => {
  res.render('index')
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' })
}

exports.upload = multer(multerOptions).single('photo')

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next() // skip to the next middleware
    return
  }
  const extension = req.file.mimetype.split('/')[1]
  req.body.photo = `${uuid.v4()}.${extension}`
  // now we resize
  const photo = await jimp.read(req.file.buffer)
  await photo.resize(800, jimp.AUTO)
  await photo.write(`./public/uploads/${req.body.photo}`)
  // once we have written photo to filesystem, keep going
  next()
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id
  const store = await (new Store(req.body)).save()
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`)
  res.redirect(`/store/${store.slug}`)
}

exports.getStores = async (req, res) => {
  // 1. query db for list of all stores
  const stores = await Store.find()
  res.render('stores', { title: 'Stores', stores })
}

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!')
  }
}

exports.editStore = async (req, res) => {
  // 1. find store given the ID
  const store = await Store.findOne({ _id: req.params.id })
  // 2. confirm they're the owner of the store
  confirmOwner(store, req.user)
  // 3. render edit form so user can update their store
  res.render('editStore', { title: `Edit ${store.name}`, store })
}

exports.updateStore = async (req, res) => {
  // 0. set location data to be a point
  req.body.location.type = 'Point'
  // 1. find and update store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new store instead of old one
    runValidators: true
  }).exec()
  req.flash('success', `Succesfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store ➡</a>`)
  // 2. redirect them to store and tell them it worked
  res.redirect(`/stores/${store._id}/edit`)
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author')
  if (!store) {
    next()
    return
  }
  res.render('store', { title: `${store.name}`, store })
}

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag
  const tagQuery = tag || { $exists: true }
  const tagsPromise = await Store.getTagsList()
  const storesPromise = Store.find({ tags: tagQuery })
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise])
  res.render('tags', { tags, title: 'Tags', tag, stores })
}

exports.searchStores = async (req, res) => {
  const stores = await Store
  // first find stores that match
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: {
      $meta: 'textScore'
    }
  })
  // then sort them
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only 5 results
  .limit(5)
  res.json(stores)
}

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat)
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
  }

  const stores = await Store.find(q).select('slug name description location photo').limit(10)
  res.json(stores)
}

exports.mapPage = (req, res) => {
  res.render('map', { title: 'map'})
}

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString())
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'
  const user = await User
    .findByIdAndUpdate(req.user._id,
      { [operator]: { hearts: req.params.id }},
      { new: true }
    )
  res.json(user)
}

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  })
  res.render('stores', { title: 'Hearted Stores', stores })
}
