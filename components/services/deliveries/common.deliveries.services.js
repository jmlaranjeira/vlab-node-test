import Deliveries from '@/models/Deliveries.model';

const find = async (req) => {
  // some vars
  let query = { when : {} };
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date
  if (req.body.when) {
    query.when = new Date(req.body.when).toISOString();
  }

  if (!req.body.when && req.body.dateFrom) {
    query.when.$gte = new Date(req.body.dateFrom);
  }

  if (!req.body.when && req.body.dateTo) {
    query.when.$lte = new Date(req.body.dateTo);
  }

  let weight = 0;
  if( req.body.weight ) {
    weight = parseInt(req.body.weight);
  }

  const [ totalResults, deliveries ] = await Promise.all([
      Deliveries.countDocuments(query),
      Deliveries.aggregate(
        [
          { $match: query },
          { $lookup: { from: 'products', 
              as: 'items',
              let: { weight: weight, idProduct: "$products" },
              pipeline: [
                { $match:
                  { $expr:
                      { $and:
                        [
                          { $in: [ "$_id",  "$$idProduct" ] },
                          { $gte: [ "$weight", "$$weight" ] }
                        ]
                      }
                  }
                },
                { $project: { _id: 0 } }
              ],    
          } },
          { $skip : skip },
          { $limit : limit },
          { $sort : sort },
          { $project: {
            _id: 0,
            when: 1,
            origin: 1,
            destination: 1,
            products: '$items' ,
            }
        }
        ])
  ]);

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  return {
    totalResults: totalResults,
    deliveries
  }
}

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    }
  }
}

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({_id: req.body.id});
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find a delivery with the sent ID`
      }
    }
  }
  return delivery;
}

export default {
  find,
  create,
  findOne
}
