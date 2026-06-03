const { catchAsync, sendResponse, AppError } = require('../utils/appError');

/**
 * Build a Mongoose query from request query params.
 * Supports: filtering, sorting, field selection, pagination, search.
 */
const buildQuery = (Model, reqQuery, searchFields = []) => {
  const queryObj = { ...reqQuery };
  const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
  excludedFields.forEach((f) => delete queryObj[f]);

  // Advanced filtering: convert gte/gt/lte/lt to MongoDB operators
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  let query = Model.find(JSON.parse(queryStr));

  // Full-text search
  if (reqQuery.search && searchFields.length) {
    const regex = new RegExp(reqQuery.search, 'i');
    query = query.find({ $or: searchFields.map((f) => ({ [f]: regex })) });
  }

  // Sorting
  if (reqQuery.sort) {
    const sortBy = reqQuery.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Field selection
  if (reqQuery.fields) {
    const fields = reqQuery.fields.split(',').join(' ');
    query = query.select(fields);
  }

  // Pagination
  const page = Math.max(1, parseInt(reqQuery.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(reqQuery.limit, 10) || 20));
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  return { query, page, limit };
};

exports.getAll = (Model, searchFields = [], populateOptions = null) =>
  catchAsync(async (req, res) => {
    const { query, page, limit } = buildQuery(Model, req.query, searchFields);
    if (populateOptions) query.populate(populateOptions);

    const [data, total] = await Promise.all([query, Model.countDocuments()]);

    sendResponse(res, 200, data, {
      results: data.length,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  });

exports.getOne = (Model, populateOptions = null) =>
  catchAsync(async (req, res) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query.populate(populateOptions);
    const doc = await query;
    if (!doc) throw new AppError(`No ${Model.modelName} found with ID: ${req.params.id}`, 404);
    sendResponse(res, 200, doc);
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res) => {
    if (req.user) {
      req.body.createdBy = req.user._id;
    }
    const doc = await Model.create(req.body);
    sendResponse(res, 201, doc);
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res) => {
    if (req.user) req.body.updatedBy = req.user._id;
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) throw new AppError(`No ${Model.modelName} found with ID: ${req.params.id}`, 404);
    sendResponse(res, 200, doc);
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw new AppError(`No ${Model.modelName} found with ID: ${req.params.id}`, 404);
    res.status(204).send();
  });